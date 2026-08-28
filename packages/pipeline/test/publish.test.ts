/**
 * Publish invariants — BUILD_PLAN.md Day 5 / ARCHITECTURE.md AD-7.
 *
 * Runs the real `publish` function against the real local dev Postgres
 * (`DATABASE_URL`, loaded from `.env`), per the `invariant-test` skill: a
 * mock proves the mock works, not the gate. Assertions read the database
 * back, not a returned filter result — the thing that matters is what a
 * reader can actually reach.
 *
 * Fixtures in `test/fixtures/` are lecture-03-shaped content (real claims
 * and evidence text, see `content/lecture-03.draft.json`) with specific
 * items flipped `redacted`/`tested`/`status`, published under out-of-range
 * week numbers (9001-9004) so the lecture rows never collide with the real
 * weeks 1-3. Every item `id` is also fixture-specific
 * (`insight-fixture-9002-...`, etc.) rather than reused from real content —
 * `items.id` is a global primary key, not scoped per lecture, so an earlier
 * version of these fixtures that reused real ids silently hijacked the real
 * week-3 rows into these fixture weeks on `publish`, then permanently
 * deleted them (cascade) when this file's own cleanup ran. Keep every
 * fixture id unique across every fixture file, always.
 */

import "dotenv/config";
import { readFile, rm, writeFile } from "node:fs/promises";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, pool, schema } from "@lecturebrief/db";
import { contentPath, run as publish } from "../src/stages/publish.js";

const FIXTURE_FILES = ["draft-lecture.json", "redacted-items.json", "untested-prompt.json", "slug-stability.json"];
const FIXTURE_WEEKS = [9001, 9002, 9003, 9004];
const TEST_USER_EMAIL = "publish-test-fixture@example.com";

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
  return JSON.parse(raw);
}

function itemIdsIn(doc: unknown): string[] {
  const d = doc as {
    lead_insight: { id: string };
    insights: { id: string }[];
    build_ideas: { id: string }[];
    agent_prompts: { id: string }[];
  };
  return [d.lead_insight.id, ...d.insights.map((i) => i.id), ...d.build_ideas.map((i) => i.id), ...d.agent_prompts.map((i) => i.id)];
}

/**
 * Guards against the exact failure this suite already hit once: a fixture id
 * that collides with a real (or another fixture's) item id gets silently
 * upserted onto the wrong lecture_week by `publish`, and this suite's own
 * cleanup then cascade-deletes it for good. Fail loudly before touching the
 * database if any fixture id already exists outside this suite's own weeks.
 */
async function assertFixtureIdsAreIsolated(): Promise<void> {
  const allIds = (await Promise.all(FIXTURE_FILES.map((f) => loadFixture(f).then(itemIdsIn)))).flat();
  const collisions = await db
    .select({ id: schema.items.id, week: schema.items.lectureWeek })
    .from(schema.items)
    .where(and(inArray(schema.items.id, allIds), notInArray(schema.items.lectureWeek, FIXTURE_WEEKS)));
  if (collisions.length > 0) {
    throw new Error(
      `Fixture item id(s) already exist under a non-fixture lecture week — this would hijack and then ` +
        `delete real data: ${JSON.stringify(collisions)}`,
    );
  }
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

beforeAll(async () => {
  await assertFixtureIdsAreIsolated();
  await cleanFixtureRows();
});
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

    expect(ids).not.toContain("insight-fixture-9002-lockfree-000003");
    expect(ids).not.toContain("build-fixture-9002-rwmutex-000005");
    expect(ids).not.toContain("prompt-fixture-9002-sortbench-000007");

    expect(ids).toContain("insight-fixture-9002-lead-000001");
    expect(ids).toContain("insight-fixture-9002-defer-000002");
    expect(ids).toContain("build-fixture-9002-escape-000004");
    expect(ids).toContain("prompt-fixture-9002-falsesharing-000006");
  });

  it("a prompt with tested: false cannot be published, while its tested sibling survives", async () => {
    const doc = await loadFixture("untested-prompt.json");
    await withContentFile(9003, doc, async () => {
      await publish(9003);
    });

    const rows = await db.select().from(schema.items).where(eq(schema.items.lectureWeek, 9003));
    const ids = rows.map((r) => r.id);

    expect(ids).not.toContain("prompt-fixture-9003-sortbench-000003");
    expect(ids).toContain("prompt-fixture-9003-falsesharing-000002");
  });

  it("re-publishing an unchanged lecture does not orphan an existing comment", async () => {
    const doc = await loadFixture("slug-stability.json");
    await withContentFile(9004, doc, async () => {
      await publish(9004);

      const [user] = await db
        .insert(schema.users)
        .values({ email: TEST_USER_EMAIL, passwordHash: "not-a-real-hash" })
        .returning();

      const itemId = "insight-fixture-9004-defer-000002";
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
