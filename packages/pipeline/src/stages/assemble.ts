/**
 * Stage: assemble.
 *
 * The missing link ARCHITECTURE.md AD-6/AD-7 and BUILD_PLAN.md's repo-layout
 * table both assume exists: something that takes the verified `extract`
 * cache (after `verify.ts` has run) and produces the canonical, committed
 * `content/lecture-NN.json` the site and `publish` both depend on. Neither
 * BUILD_PLAN.md nor ARCHITECTURE.md names a stage that does this, so this
 * file is the resolution — see the header comment on `run` below for which
 * of the two options BUILD_PLAN.md's Day 5 note raised, and why.
 *
 * This stage never writes `content/lecture-NN.json` itself. It writes
 * `content/lecture-NN.draft.json` — already gitignored (`.gitignore`'s
 * `content/*.draft.json`, in place since the Day 1 scaffold) precisely so it
 * can be regenerated from the pipeline on every `extract`/`verify` re-run
 * without fighting or clobbering whatever hand edits the operator has made
 * to the real, committed file. Promoting a draft to the canonical file — the
 * point at which `redacted`, `tested`, and `status` become the operator's to
 * edit — is a manual copy, by design: an automatic overwrite is exactly the
 * failure mode ARCHITECTURE.md AD-7 exists to prevent.
 */

import { LectureDocument, SCHEMA_VERSION } from "@lecturebrief/schema";
import { readCache, isCached } from "../cache.js";
import { PATHS } from "../config.js";
import { ExtractResult } from "./extract.js";
import { Corrected } from "./correct.js";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface AssembleMeta {
  title: string;
  /** ISO date string, `YYYY-MM-DD`. */
  date: string;
}

export function draftPath(week: number): string {
  return join(PATHS.content, `lecture-${String(week).padStart(2, "0")}.draft.json`);
}

/**
 * Assembles a `LectureDocument` from the verified extract cache plus the
 * operator-supplied `title`/`date` (schema comment: "human-written, not
 * model-generated" — there is no model output to source them from). Always
 * `status: "draft"` (ARCHITECTURE.md AD-7's default) — nothing here ever
 * marks a lecture approved; that is the operator's hand edit on the promoted
 * file.
 */
export async function run(
  videoId: string,
  week: number,
  meta: AssembleMeta,
): Promise<{ data: LectureDocument; path: string }> {
  if (!isCached(videoId, "extract")) {
    throw new Error(`assemble: no extract cache for week ${week} (${videoId}). Run \`brief extract ${week}\` first.`);
  }
  const extract = await readCache(videoId, "extract", ExtractResult);
  if (!extract.verified) {
    throw new Error(`assemble: week ${week} (${videoId})'s extract cache hasn't been verified. Run \`brief verify ${week}\` first.`);
  }
  if (!isCached(videoId, "corrected")) {
    throw new Error(`assemble: no corrected-transcript cache for week ${week} (${videoId}). Run \`brief correct ${videoId}\` first.`);
  }
  const corrected = await readCache(videoId, "corrected", Corrected);

  const data = LectureDocument.parse({
    schema_version: SCHEMA_VERSION,
    week,
    date: meta.date,
    title: meta.title,
    status: "draft",
    prompt_version: extract.promptVersion,
    generated_at: new Date().toISOString(),
    lead_insight: extract.leadInsight,
    insights: extract.insights,
    build_ideas: extract.buildIdeas,
    agent_prompts: extract.agentPrompts,
    callbacks: extract.callbacks,
    glossary: extract.glossary,
    announcements: extract.announcements,
    open_questions: extract.openQuestions,
    corrections_log: corrected.correctionsLog,
  } satisfies LectureDocument);

  const path = draftPath(week);
  await mkdir(PATHS.content, { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  return { data, path };
}
