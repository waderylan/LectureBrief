/**
 * Publish invariants — BUILD_PLAN.md Day 5 / ARCHITECTURE.md AD-7.
 *
 * Runs the real `publish` function against the real local dev Postgres
 * (`DATABASE_URL`, loaded from `.env`), per the `invariant-test` skill: a
 * mock proves the mock works, not the gate. Assertions read the database
 * back, not a returned filter result — the thing that matters is what a
 * reader can actually reach.
 *
 * Fixtures in `test/fixtures/` are real lecture-03 content (see
 * `content/lecture-03.draft.json`) with specific items flipped
 * `redacted`/`tested`/`status`, published under out-of-range week numbers
 * (9001-9004) so they never collide with the real weeks 1-3.
 */

import "dotenv/config";
import { readFile, rm, writeFile } from "node:fs/promises";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool, schema } from "@lecturebrief/db";
import { contentPath, run as publish } from "../src/stages/publish.js";

const FIXTURE_WEEKS = [9001, 9002, 9003, 9004];
const TEST_USER_EMAIL = "publish-test-fixture@example.com";

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
  return JSON.parse(raw);
}

async function withContentFile(week: number, doc: unknown, fn: () => Promise<void>): Promise<void> {
  const path = contentPath(week);
  await writeFile(path, JSON.stringify(doc, null, 2), "utf8");
  try {
    await fn();
  } finally {
    await rm(path, { force: true });
  }
}

async function cleanFixtureRows(): Promise<void> {
  // Cascades: lectures -> items -> comments (see packages/db/src/schema.ts).
  await db.delete(schema.lectures).where(inArray(schema.lectures.week, FIXTURE_WEEKS));
  await db.delete(schema.users).where(eq(schema.users.email, TEST_USER_EMAIL));
}

beforeAll(cleanFixtureRows);
afterAll(async () => {
  await cleanFixtureRows();
  await pool.end();
});

describe("publish", () => {
  it("a draft lecture cannot be published", async () => {
    const doc = await loadFixture("draft-lecture.json");
    await withContentFile(9001, doc, async () => {
      await expect(publish(9001)).rejects.toThrow(/not "approved"/);
    });

    const rows = await db.select().from(schema.lectures).where(eq(schema.lectures.week, 9001));
    expect(rows).toHaveLength(0);
  });

  it("a redacted item cannot be published", async () => {
    const doc = await loadFixture("redacted-items.json");
    await withContentFile(9002, doc, async () => {
      await publish(9002);
    });

    const rows = await db.select().from(schema.items).where(eq(schema.items.lectureWeek, 9002));
    const ids = rows.map((r) => r.id);

    expect(ids).not.toContain("insight-a-lock-free-channel-implementation-was-written-a-542431b4");
    expect(ids).not.toContain("build-diy-distributed-reader-writer-mutex-with-cache-l-047cf127");
    expect(ids).not.toContain("prompt-interface-vs-struct-sort-benchmark-3570f8a3");

    expect(ids).toContain("insight-a-two-line-change-that-removed-a-single-unnecess-4b925d37");
    expect(ids).toContain("insight-defer-s-overhead-ballooned-and-then-was-dramatic-be75f03f");
    expect(ids).toContain("build-escape-analysis-detective-toolkit-7254b312");
    expect(ids).toContain("prompt-false-sharing-reproduction-and-fix-fd3e97c7");
  });

  it("a prompt with tested: false cannot be published, while its tested sibling survives", async () => {
    const doc = await loadFixture("untested-prompt.json");
    await withContentFile(9003, doc, async () => {
      await publish(9003);
    });

    const rows = await db.select().from(schema.items).where(eq(schema.items.lectureWeek, 9003));
    const ids = rows.map((r) => r.id);

    expect(ids).not.toContain("prompt-interface-vs-struct-sort-benchmark-3570f8a3");
    expect(ids).toContain("prompt-false-sharing-reproduction-and-fix-fd3e97c7");
  });

  it("re-publishing an unchanged lecture does not orphan an existing comment", async () => {
    const doc = await loadFixture("slug-stability.json");
    await withContentFile(9004, doc, async () => {
      await publish(9004);

      const [user] = await db
        .insert(schema.users)
        .values({ email: TEST_USER_EMAIL, passwordHash: "not-a-real-hash" })
        .returning();

      const itemId = "insight-defer-s-overhead-ballooned-and-then-was-dramatic-be75f03f";
      const [comment] = await db
        .insert(schema.comments)
        .values({ itemId, userId: user!.id, body: "I remember this part of the talk." })
        .returning();

      // Same lecture, no content change — the id-matching this depends on
      // lives in `extract.ts`'s `assignIds`, upstream of publish; here we're
      // asserting publish's own upsert doesn't delete-then-reinsert the item
      // and sever the FK in the process.
      await publish(9004);

      const stillThere = await db.select().from(schema.comments).where(eq(schema.comments.id, comment!.id));
      expect(stillThere).toHaveLength(1);
      expect(stillThere[0]!.itemId).toBe(itemId);
    });
  });
});
