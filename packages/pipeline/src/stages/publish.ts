/**
 * Stage: publish.
 *
 * The only path content takes into Postgres (ARCHITECTURE.md AD-6, amended
 * by BUILD_PLAN.md §1). Reads the canonical, committed, hand-edited
 * `content/lecture-NN.json` directly off disk — never the pipeline cache and
 * never `*.draft.json` — because that file is the one the operator has
 * actually reviewed and approved. See `assemble.ts`'s header for why the
 * draft/canonical split exists.
 *
 * Three gates, all "impossible to skip" per ARCHITECTURE.md AD-7:
 *  - `status` must be `"approved"`. Anything else throws before touching the DB.
 *  - Any insight, build idea, or agent prompt with `redacted: true` is dropped.
 *  - Any agent prompt with `tested: false` is dropped, redacted or not.
 *
 * `lead_insight` is exempt from silent dropping: if the operator redacted it,
 * that is an editorial call (which item becomes the new lead) that only a
 * human should make, so this throws and asks them to hand-edit the file
 * rather than auto-promoting a replacement the way `verify.ts` does for
 * failed grounding.
 *
 * Upsert preserves item ids that are unchanged across a republish (comments
 * FK to them — ARCHITECTURE.md §9) and only removes rows for ids no longer
 * present in this publish (which cascades to their comments).
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { eq, and, notInArray } from "drizzle-orm";
import { LectureDocument, type Insight, type BuildIdea, type AgentPrompt } from "@lecturebrief/schema";
import { db, schema } from "@lecturebrief/db";
import { PATHS } from "../config.js";

export function contentPath(week: number): string {
  return join(PATHS.content, `lecture-${String(week).padStart(2, "0")}.json`);
}

export interface PublishResult {
  week: number;
  insightsPublished: number;
  buildIdeasPublished: number;
  agentPromptsPublished: number;
  droppedRedacted: number;
  droppedUntested: number;
}

interface ItemRow {
  id: string;
  kind: "insight" | "build_idea" | "agent_prompt";
  isLead: boolean;
  orderIndex: number;
  data: Insight | BuildIdea | AgentPrompt;
}

export async function run(week: number): Promise<PublishResult> {
  const path = contentPath(week);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(
      `publish: ${path} does not exist. Run \`brief assemble ${week}\`, review the draft it writes, ` +
        `and copy it to ${path} once it's ready for hand-editing and approval.`,
    );
  }

  const doc = LectureDocument.parse(JSON.parse(raw));

  if (doc.week !== week) {
    throw new Error(`publish: ${path} has week ${doc.week}, expected ${week}.`);
  }
  if (doc.status !== "approved") {
    throw new Error(
      `publish: ${path} has status "${doc.status}", not "approved". Refusing to publish (ARCHITECTURE.md AD-7).`,
    );
  }
  if (doc.lead_insight.redacted) {
    throw new Error(
      `publish: the lead insight (${doc.lead_insight.id}) is redacted. Choose a new lead insight by hand-editing ` +
        `${path} — publish will not auto-promote a replacement for the lecture's single most important claim.`,
    );
  }

  let droppedRedacted = 0;
  let droppedUntested = 0;

  const rows: ItemRow[] = [];

  rows.push({ id: doc.lead_insight.id, kind: "insight", isLead: true, orderIndex: 0, data: doc.lead_insight });

  doc.insights.forEach((insight, i) => {
    if (insight.redacted) {
      droppedRedacted++;
      return;
    }
    rows.push({ id: insight.id, kind: "insight", isLead: false, orderIndex: i + 1, data: insight });
  });

  doc.build_ideas.forEach((idea, i) => {
    if (idea.redacted) {
      droppedRedacted++;
      return;
    }
    rows.push({ id: idea.id, kind: "build_idea", isLead: false, orderIndex: i, data: idea });
  });

  doc.agent_prompts.forEach((prompt, i) => {
    if (prompt.redacted) {
      droppedRedacted++;
      return;
    }
    if (!prompt.tested) {
      droppedUntested++;
      return;
    }
    rows.push({ id: prompt.id, kind: "agent_prompt", isLead: false, orderIndex: i, data: prompt });
  });

  const freshIds = rows.map((r) => r.id);

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.lectures)
      .values({
        week: doc.week,
        date: doc.date,
        title: doc.title,
        promptVersion: doc.prompt_version,
        generatedAt: doc.generated_at,
        callbacks: doc.callbacks,
        glossary: doc.glossary,
        announcements: doc.announcements,
        openQuestions: doc.open_questions,
      })
      .onConflictDoUpdate({
        target: schema.lectures.week,
        set: {
          date: doc.date,
          title: doc.title,
          promptVersion: doc.prompt_version,
          generatedAt: doc.generated_at,
          callbacks: doc.callbacks,
          glossary: doc.glossary,
          announcements: doc.announcements,
          openQuestions: doc.open_questions,
          publishedAt: new Date(),
        },
      });

    // Remove rows for ids no longer part of this publish (cascades to their
    // comments) before upserting the survivors, so a stale id can never
    // shadow a freshly-minted one that happens to reuse it.
    await tx.delete(schema.items).where(
      freshIds.length > 0
        ? and(eq(schema.items.lectureWeek, doc.week), notInArray(schema.items.id, freshIds))
        : eq(schema.items.lectureWeek, doc.week),
    );

    for (const row of rows) {
      await tx
        .insert(schema.items)
        .values({
          id: row.id,
          lectureWeek: doc.week,
          kind: row.kind,
          isLead: row.isLead,
          orderIndex: row.orderIndex,
          data: row.data,
        })
        .onConflictDoUpdate({
          target: schema.items.id,
          set: {
            lectureWeek: doc.week,
            kind: row.kind,
            isLead: row.isLead,
            orderIndex: row.orderIndex,
            data: row.data,
            updatedAt: new Date(),
          },
        });
    }
  });

  return {
    week: doc.week,
    insightsPublished: rows.filter((r) => r.kind === "insight").length,
    buildIdeasPublished: rows.filter((r) => r.kind === "build_idea").length,
    agentPromptsPublished: rows.filter((r) => r.kind === "agent_prompt").length,
    droppedRedacted,
    droppedUntested,
  };
}
