/**
 * Shared Postgres client. Imported by `packages/pipeline` (publish) and
 * `apps/web` (reads, server actions) so both sides talk to the same schema
 * through the same connection setup rather than each rolling their own.
 */

import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as dbSchema from "./schema.js";

// Lazy on purpose: `packages/pipeline`'s CLI imports every stage module up
// front (see `pipeline-stage`'s "registered in cli.ts" contract), including
// ones — `publish` — that depend on this package. Connecting eagerly at
// import time would mean every unrelated `brief` subcommand (`extract`,
// `assemble`, ...) required `DATABASE_URL` and paid for a pool connection it
// never uses, which breaks ARCHITECTURE.md AD-9's "the loop must be seconds"
// requirement for the commands that don't touch Postgres at all.
let _pool: Pool | undefined;
let _db: NodePgDatabase<typeof dbSchema> | undefined;

function getPool(): Pool {
  if (!_pool) {
    const url = process.env["DATABASE_URL"];
    if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
    // node-postgres speaks plain Postgres wire protocol, which Neon also
    // serves, so the same driver works against the local dev container and a
    // Neon URL — only the connection string (and Neon's required
    // `sslmode=require`) changes.
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

function getDb(): NodePgDatabase<typeof dbSchema> {
  if (!_db) _db = drizzle(getPool(), { schema: dbSchema });
  return _db;
}

function lazyForward<T extends object>(get: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, _receiver) {
      const real = get();
      const value = Reflect.get(real as object, prop, real as object);
      return typeof value === "function" ? value.bind(real) : value;
    },
  });
}

export const pool = lazyForward(getPool);
export const db = lazyForward(getDb);
export * as schema from "./schema.js";
