/**
 * Stage: extract.
 *
 * Single-pass map+reduce, merged per BUILD_PLAN.md §5: a talk transcript is
 * ~7-8k tokens, so windowing it (ARCHITECTURE.md AD-4) is pure overhead with
 * nothing to recover. One structured call does what used to be map and
 * reduce together.
 *
 * BUILD_PLAN.md Day 4 extends this call rather than adding a separate
 * "reduce" or "slides" stage: the slide deck text (from the `slides` stage)
 * and the coursework exclusion list (from `syllabus.md`'s assignment
 * section) join the transcript as additional context in the same request,
 * and the model assigns AD-5's three-way `slide_relation` and does its own
 * exclusion self-check right here. There's no separate reduce call left to
 * hand them to — Day 3 already merged that into this one. Verification
 * stays genuinely separate (see `verify.ts`): isolation from this context is
 * what makes it a real check.
 *
 * `verification` is still not requested from the model here — the `verify`
 * stage is a later, isolated pass over the cached output of this one, and
 * this stage fills the field with a provisional `supported` that `verify`
 * overwrites (or drops the item entirely). Nothing produced here is
 * published: `status` stays `draft` until a human approves it.
 *
 * `timestamp` is never asked of the model for anything anchored to an
 * `evidence` span. The plain-text transcript handed to the model carries no
 * timing markers, so a model-reported number would be a guess; instead this
 * code finds exactly where the (verified verbatim) evidence sits in the
 * segment stream and reads the real segment start time off it. That is also
 * what makes the verbatim check load-bearing rather than a formality: an
 * evidence span that isn't found gets no timestamp and is dropped.
 *
 * Slug stability (ARCHITECTURE.md §9): ids are minted once from content and
 * persisted. On re-run, each fresh item is matched against whatever is
 * currently cached by evidence-span overlap; only a genuinely new item mints
 * a new id. The previous cache is read even under `--force`, because forcing
 * a recompute must not be the same thing as forgetting every id.
 */

import { createHash } from "node:crypto";
import { z } from "zod";
import {
  Insight,
  BuildIdea,
  AgentPrompt,
  Origin,
  Stance,
  Speaker,
  SlideRelation,
  Effort as BuildEffort,
  Callback,
  GlossaryEntry,
  Announcement,
} from "@lecturebrief/schema";
import { callJson } from "../llm.js";
import { loadPrompt, fill } from "../prompts.js";
import { cached, isCached, readCache } from "../cache.js";
import { EFFORT } from "../config.js";
import type { Segment } from "../types.js";

const RawOrigin = z.object({ evidence: z.string().min(1) });

export function wordCount(value: string): number {
  const words = value.trim().match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu);
  return words?.length ?? 0;
}

function textAtMost(maxWords: number, allowEmpty = false) {
  const base = allowEmpty ? z.string() : z.string().min(1);
  return base.refine((value) => wordCount(value) <= maxWords, {
    message: `must contain at most ${maxWords} words`,
  });
}

function textBetween(minWords: number, maxWords: number) {
  return z.string().refine(
    (value) => {
      const count = wordCount(value);
      return count >= minWords && count <= maxWords;
    },
    { message: `must contain between ${minWords} and ${maxWords} words` },
  );
}

// No `.default()` on these: it makes zod's inferred *input* type optional
// while the *output* type stays required, and `z.infer` picks up that split
// (see the pre-existing `Segment.speaker` mismatch this codebase already has
// from Day 1/2). The extraction prompt lists every field in its example JSON,
// including empty-array cases, so the model always supplies them.
const RawInsight = z.object({
  claim: textAtMost(30),
  context: textAtMost(16, true),
  evidence: z.string().min(1),
  slide_relation: SlideRelation,
  stance: Stance,
  speaker: Speaker,
  tags: z.array(textAtMost(3)).min(1).max(4),
});
type RawInsight = z.infer<typeof RawInsight>;

const RawBuildIdea = z.object({
  title: textAtMost(7),
  pitch: textAtMost(40),
  effort: BuildEffort,
  you_will_learn: textAtMost(18),
  stack_hint: z.array(z.string()),
  origin: RawOrigin,
});
type RawBuildIdea = z.infer<typeof RawBuildIdea>;

const RawAgentPrompt = z.object({
  title: textAtMost(7),
  what_it_does: textAtMost(18),
  prompt: textBetween(60, 160),
  prerequisites: z.array(textAtMost(8)).max(4),
  origin: RawOrigin,
});
type RawAgentPrompt = z.infer<typeof RawAgentPrompt>;

export const RawExtraction = z.object({
  lead_insight: RawInsight,
  insights: z.array(RawInsight),
  build_ideas: z.array(RawBuildIdea),
  agent_prompts: z.array(RawAgentPrompt),
  callbacks: z.array(z.object({ to_week: z.number(), note: textAtMost(20), timestamp: z.number() })),
  glossary: z.array(
    z.object({ term: z.string().min(1), definition: textAtMost(20), timestamp: z.number() }),
  ),
  announcements: z.array(z.object({ text: textAtMost(20), timestamp: z.number() })),
  open_questions: z.array(textAtMost(20)),
});

export const ExtractResult = z.object({
  promptVersion: z.string(),
  leadInsight: Insight,
  insights: z.array(Insight),
  buildIdeas: z.array(BuildIdea),
  agentPrompts: z.array(AgentPrompt),
  callbacks: z.array(Callback),
  glossary: z.array(GlossaryEntry),
  announcements: z.array(Announcement),
  openQuestions: z.array(z.string()),
  /** Items the model produced whose evidence wasn't found verbatim in the transcript. Dropped, not published. */
  droppedForMissingEvidence: z.number(),
  /** Whether `verify.ts` has already rewritten this cache entry's `verification` fields. */
  verified: z.boolean(),
  /** Insights `verify.ts` dropped as `unsupported`. Zero until verify has run. */
  droppedForUnsupported: z.number(),
});
export type ExtractResult = z.infer<typeof ExtractResult>;

export function normalizeWs(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "item";
}

function shortHash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 8);
}

/** Containment-based overlap: 1 for an exact match, 0 for no shared span. */
function evidenceOverlap(a: string, b: string): number {
  const na = normalizeWs(a);
  const nb = normalizeWs(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  return longer.includes(shorter) ? shorter.length / longer.length : 0;
}

const ID_MATCH_THRESHOLD = 0.5;

/**
 * Match each fresh item against the previous run's items by evidence overlap,
 * greedily, one previous id used at most once. Unmatched items mint a new id
 * from their own content, so identical re-runs are stable even with no
 * previous cache to match against.
 */
function assignIds<T>(
  prefix: string,
  fresh: T[],
  previous: ReadonlyArray<{ id: string; evidence: string }>,
  evidenceOf: (item: T) => string,
  titleOf: (item: T) => string,
): (T & { id: string })[] {
  const used = new Set<string>();
  return fresh.map((item) => {
    let bestId: string | undefined;
    let bestScore = 0;
    for (const prev of previous) {
      if (used.has(prev.id)) continue;
      const score = evidenceOverlap(evidenceOf(item), prev.evidence);
      if (score > bestScore) {
        bestScore = score;
        bestId = prev.id;
      }
    }
    if (bestId !== undefined && bestScore >= ID_MATCH_THRESHOLD) {
      used.add(bestId);
      return { ...item, id: bestId };
    }
    return { ...item, id: `${prefix}-${slugify(titleOf(item))}-${shortHash(evidenceOf(item))}` };
  });
}

/** Maps a position in the normalized whole-transcript text back to a segment start time. */
interface TranscriptIndex {
  text: string;
  marks: ReadonlyArray<{ pos: number; start: number }>;
}

function buildTranscriptIndex(segments: readonly Segment[]): TranscriptIndex {
  let text = "";
  const marks: Array<{ pos: number; start: number }> = [];
  for (const seg of segments) {
    marks.push({ pos: text.length, start: seg.start });
    text += (text ? " " : "") + normalizeWs(seg.text);
  }
  return { text, marks };
}

/** The start time of the segment containing the beginning of `evidence`, or null if not found. */
function timestampFor(evidence: string, index: TranscriptIndex): number | null {
  const idx = index.text.indexOf(normalizeWs(evidence));
  if (idx === -1) return null;
  let ts: number | null = null;
  for (const m of index.marks) {
    if (m.pos <= idx) ts = m.start;
    else break;
  }
  return ts;
}

export async function run(
  videoId: string,
  punctuated: { text: string; segments: Segment[] },
  context: { slidesText: string; exclusions: string },
  opts: { force?: boolean } = {},
): Promise<{ data: ExtractResult; fromCache: boolean }> {
  const previous = isCached(videoId, "extract")
    ? await readCache(videoId, "extract", ExtractResult).catch(() => null)
    : null;

  return cached(videoId, "extract", ExtractResult, opts.force ?? false, async () => {
    const prompt = await loadPrompt("extract");
    const { data: raw } = await callJson(RawExtraction, {
      system: prompt.system,
      user: fill(prompt.template, {
        transcript: punctuated.text,
        slides: context.slidesText,
        exclusions: context.exclusions,
      }),
      effort: EFFORT.extract,
    });

    const index = buildTranscriptIndex(punctuated.segments);
    let dropped = 0;
    const findTs = (evidence: string): number | null => {
      const ts = timestampFor(evidence, index);
      if (ts === null) dropped++;
      return ts;
    };

    const leadTs = findTs(raw.lead_insight.evidence);
    const insightsResolved = raw.insights
      .map((i) => ({ ...i, __ts: findTs(i.evidence) }))
      .filter((i): i is RawInsight & { __ts: number } => i.__ts !== null);
    const leadCandidate =
      leadTs !== null ? { ...raw.lead_insight, __ts: leadTs } : insightsResolved.shift();
    if (!leadCandidate) {
      throw new Error(
        `extract: no insight for ${videoId} survived the verbatim-evidence check — every evidence span the model returned failed to match the transcript`,
      );
    }

    const previousInsightPool = previous ? [previous.leadInsight, ...previous.insights] : [];
    const insightsWithIds = assignIds(
      "insight",
      [leadCandidate, ...insightsResolved],
      previousInsightPool,
      (i) => i.evidence,
      (i) => i.claim,
    );
    // assignIds preserves length, and the input array above always has at
    // least one element (leadCandidate), so this is never undefined.
    const leadWithId = insightsWithIds[0]!;
    const restWithId = insightsWithIds.slice(1);

    const finalizeInsight = (i: RawInsight & { __ts: number; id: string }): Insight =>
      Insight.parse({
        id: i.id,
        claim: i.claim,
        context: i.context,
        evidence: i.evidence,
        timestamp: i.__ts,
        slide_relation: i.slide_relation,
        stance: i.stance,
        speaker: i.speaker,
        // Provisional — the separate `verify` stage assigns the real value.
        verification: "supported",
        tags: i.tags,
        redacted: false,
      });

    const buildIdeasResolved = raw.build_ideas
      .map((b) => ({ ...b, __ts: findTs(b.origin.evidence) }))
      .filter((b): b is RawBuildIdea & { __ts: number } => b.__ts !== null);
    const previousBuildPool = (previous?.buildIdeas ?? []).map((b) => ({
      id: b.id,
      evidence: b.origin.evidence,
    }));
    const buildIdeas = assignIds(
      "build",
      buildIdeasResolved,
      previousBuildPool,
      (b) => b.origin.evidence,
      (b) => b.title,
    ).map((b) =>
      BuildIdea.parse({
        id: b.id,
        title: b.title,
        pitch: b.pitch,
        effort: b.effort,
        you_will_learn: b.you_will_learn,
        stack_hint: b.stack_hint,
        origin: Origin.parse({ evidence: b.origin.evidence, timestamp: b.__ts }),
        redacted: false,
      }),
    );

    const agentPromptsResolved = raw.agent_prompts
      .map((p) => ({ ...p, __ts: findTs(p.origin.evidence) }))
      .filter((p): p is RawAgentPrompt & { __ts: number } => p.__ts !== null);
    const previousPromptPool = (previous?.agentPrompts ?? []).map((p) => ({
      id: p.id,
      evidence: p.origin.evidence,
    }));
    const agentPrompts = assignIds(
      "prompt",
      agentPromptsResolved,
      previousPromptPool,
      (p) => p.origin.evidence,
      (p) => p.title,
    ).map((p) =>
      AgentPrompt.parse({
        id: p.id,
        title: p.title,
        what_it_does: p.what_it_does,
        prompt: p.prompt,
        prerequisites: p.prerequisites,
        origin: Origin.parse({ evidence: p.origin.evidence, timestamp: p.__ts }),
        // Publication gate (ARCHITECTURE.md §6.2) — nothing the pipeline
        // generates is tested until the operator runs it by hand, Day 6.
        tested: false,
        redacted: false,
      }),
    );

    return {
      promptVersion: prompt.version,
      leadInsight: finalizeInsight(leadWithId),
      insights: restWithId.map(finalizeInsight),
      buildIdeas,
      agentPrompts,
      callbacks: raw.callbacks.map((c) => Callback.parse(c)),
      glossary: raw.glossary.map((g) => GlossaryEntry.parse(g)),
      announcements: raw.announcements.map((a) => Announcement.parse(a)),
      openQuestions: raw.open_questions,
      droppedForMissingEvidence: dropped,
      verified: false,
      droppedForUnsupported: 0,
    };
  });
}
