/**
 * Stage: punctuate.
 *
 * YouTube auto-captions carry capitalization but no sentence punctuation, so a
 * verbatim `evidence` span renders as a run-on. This pass inserts punctuation.
 *
 * AD-3 forbids the correction pass from restructuring sentences because a model
 * told to "clean up" a transcript smooths away the informal asides that are the
 * product. That rule is not merely instructed here, and not merely checked: the
 * output is rebuilt from the original word array by `mergePunctuation`, taking
 * only punctuation and casing from the model. The invariant therefore holds by
 * construction and no model behaviour can violate it.
 *
 * Spans are large deliberately. An invocation costs ~22k tokens of harness
 * overhead against a few hundred tokens of content, so call count — not span
 * size — is what drives the bill. There is no retry for the same reason.
 */

import { z } from "zod";
import { callJson } from "../llm.js";
import { loadPrompt, fill } from "../prompts.js";
import { cached, cacheDir, isCached, readCache } from "../cache.js";
import { EFFORT, PUNCTUATE_SPAN_CHARS } from "../config.js";
import { mergePunctuation } from "../punctmerge.js";
import { Segment } from "../types.js";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";


const Punctuated = z.object({ text: z.string() });

export const PunctuatedTranscript = z.object({
  promptVersion: z.string(),
  segments: z.array(Segment),
  text: z.string(),
  spansTotal: z.number(),
  /** Spans where the call itself failed. Distinct from a bad answer. */
  spansErrored: z.number(),
  /** Words that took the model's punctuation and casing. */
  wordsKept: z.number(),
  /** Words the model altered, restored from the original by the merge. */
  wordsRestored: z.number(),
  /** Spans served from the per-span cache without an LLM call. */
  spansCachedHit: z.number(),
  /** Why any span failed. Empty when everything succeeded. */
  errors: z.array(z.string()),
});
export type PunctuatedTranscript = z.infer<typeof PunctuatedTranscript>;

/**
 * Words only: lowercase, alphanumerics, single-spaced.
 *
 * Apostrophes are deleted rather than replaced with a space, so that inserting
 * one — which the prompt explicitly permits — does not split a word and trip the
 * invariant. Without this, "kernels" punctuated to "kernel's" reads as two words
 * where there was one, and a correct response is rejected.
 */
export function wordSignature(s: string): string {
  return s
    .toLowerCase()
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The invariant. Punctuation and casing may change; words may not. */
export function preservesWords(before: string, after: string): boolean {
  return wordSignature(before) === wordSignature(after);
}

/** First differing word between two spans, for a targeted retry message. */
export function firstDivergence(before: string, after: string): { want: string; got: string } {
  const a = wordSignature(before).split(" ");
  const b = wordSignature(after).split(" ");
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return {
    want: a.slice(Math.max(0, i - 3), i + 3).join(" "),
    got: b.slice(Math.max(0, i - 3), i + 3).join(" "),
  };
}

/**
 * Per-span cache path. Keyed by span content and prompt version, so editing the
 * prompt invalidates everything and editing nothing costs nothing.
 */
function spanCachePath(videoId: string): string {
  return join(cacheDir(videoId), "punct-spans.json");
}

export function spanKey(span: string, promptVersion: string): string {
  return createHash("sha256").update(promptVersion + "|" + span).digest("hex").slice(0, 32);
}

async function readSpanCache(videoId: string, force: boolean): Promise<Record<string, string>> {
  const p = spanCachePath(videoId);
  if (force) {
    await rm(p, { force: true });
    return {};
  }
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(await readFile(p, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

async function writeSpanCache(videoId: string, cache: Record<string, string>): Promise<void> {
  const p = spanCachePath(videoId);
  await mkdir(cacheDir(videoId), { recursive: true });
  await writeFile(p, JSON.stringify(cache, null, 2), "utf8");
}

/** Group segments into spans big enough to punctuate sensibly. */
function toSpans(segments: Segment[]): Segment[][] {
  const spans: Segment[][] = [];
  let cur: Segment[] = [];
  let len = 0;
  for (const s of segments) {
    cur.push(s);
    len += s.text.length;
    if (len >= PUNCTUATE_SPAN_CHARS) {
      spans.push(cur);
      cur = [];
      len = 0;
    }
  }
  if (cur.length) spans.push(cur);
  return spans;
}

/**
 * Redistribute a punctuated span back over its segments, preserving each
 * segment's original word count so timestamps stay aligned.
 */
function redistribute(span: Segment[], punctuated: string): Segment[] {
  const words = punctuated.split(/\s+/).filter(Boolean);
  const out: Segment[] = [];
  let i = 0;
  for (const seg of span) {
    const n = seg.text.split(/\s+/).filter(Boolean).length;
    out.push({ ...seg, text: words.slice(i, i + n).join(" ") });
    i += n;
  }
  return out;
}

/**
 * The previously cached result, if any.
 *
 * The stage cache alone would happily serve a result that had failed spans in
 * it. The caller uses this to notice that and recompute — which is now cheap,
 * because the per-span cache means only the failed spans actually call out.
 */
export async function peek(videoId: string): Promise<PunctuatedTranscript | null> {
  if (!isCached(videoId, "punctuated")) return null;
  try {
    return await readCache(videoId, "punctuated", PunctuatedTranscript);
  } catch {
    return null;
  }
}

export async function run(
  videoId: string,
  input: { segments: Segment[] },
  opts: { force?: boolean } = {},
): Promise<{ data: PunctuatedTranscript; fromCache: boolean }> {
  return cached(
    videoId,
    "punctuated",
    PunctuatedTranscript,
    opts.force ?? false,
    async () => {
      const prompt = await loadPrompt("punctuate");
      const spans = toSpans(input.segments);
      const segments: Segment[] = [];
      let errored = 0;
      let wordsKept = 0;
      let wordsRestored = 0;
      let spansCachedHit = 0;
      const errors: string[] = [];

      // Per-span cache. Without it, one failed span forces every other span in
      // the talk to be recomputed, which at ~22k tokens of overhead per call is
      // the entire cost of the stage paid again to repair a fraction of it.
      const spanCache = await readSpanCache(videoId, opts.force ?? false);

      for (const span of spans) {
        const original = span.map((s) => s.text).join(" ");
        const originalWords = original.split(/\s+/).filter(Boolean);
        const key = spanKey(original, prompt.version);

        let text = spanCache[key] ?? null;
        if (text !== null) {
          spansCachedHit++;
        } else {
          try {
            const { data } = await callJson(Punctuated, {
              system: prompt.system,
              user: fill(prompt.template, { span: original }),
              effort: EFFORT.punctuate,
            });
            // No retry. The merge keeps every original word and takes only
            // punctuation and casing from the model, so a partly-wrong answer
            // is still worth most of its punctuation — and a second invocation
            // costs ~22k tokens to buy a few hundred tokens of content.
            const merged = mergePunctuation(originalWords, data.text);
            text = merged.text;
            wordsKept += merged.matched;
            wordsRestored += merged.unmatched;
            spanCache[key] = text;
          } catch (e) {
            // A failed call is not a failed answer. Record why, and leave the
            // span uncached so the next run retries only this one.
            errored++;
            errors.push(e instanceof Error ? e.message.slice(0, 200) : String(e));
          }
        }

        if (text === null) segments.push(...span);
        else segments.push(...redistribute(span, text));
      }

      await writeSpanCache(videoId, spanCache);

      return {
        promptVersion: prompt.version,
        segments,
        text: segments.map((s) => s.text).join(" "),
        spansTotal: spans.length,
        spansErrored: errored,
        wordsKept,
        wordsRestored,
        spansCachedHit,
        errors,
      };
    },
  );
}
