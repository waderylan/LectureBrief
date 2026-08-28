/**
 * Stage: punctuate.
 *
 * YouTube auto-captions carry capitalization but no sentence punctuation, so a
 * verbatim `evidence` span renders as a run-on. This pass inserts punctuation.
 *
 * AD-3 forbids the correction pass from restructuring sentences because a model
 * told to "clean up" a transcript smooths away the informal asides that are the
 * product. That rule is enforced here by a mechanical invariant rather than by
 * instruction: strip punctuation and casing from input and output and the word
 * sequences must be identical. A model that drops a filler word, reorders, or
 * paraphrases fails the check and its span is discarded in favour of the
 * original — so the failure mode is "still unpunctuated", never "quietly
 * rewritten".
 */

import { z } from "zod";
import { callJson } from "../llm.js";
import { loadPrompt, fill } from "../prompts.js";
import { cached } from "../cache.js";
import { EFFORT, PUNCTUATE_SPAN_CHARS } from "../config.js";
import { Segment } from "../types.js";

const Punctuated = z.object({ text: z.string() });

export const PunctuatedTranscript = z.object({
  promptVersion: z.string(),
  segments: z.array(Segment),
  text: z.string(),
  spansTotal: z.number(),
  /** Spans where the model violated the word-sequence invariant. */
  spansRejected: z.number(),
  /** Spans where the call itself failed. Distinct from a bad answer. */
  spansErrored: z.number(),
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
      let rejected = 0;
      let errored = 0;

      for (const span of spans) {
        const original = span.map((s) => s.text).join(" ");
        let accepted: string | null = null;

        try {
          let user = fill(prompt.template, { span: original });

          // Two attempts. The model's habitual violation is silently fixing a
          // transcription error, so naming the exact word it changed is far
          // more effective than restating the rule.
          for (let attempt = 0; attempt < 2; attempt++) {
            const { data } = await callJson(Punctuated, {
              system: prompt.system,
              user,
              effort: EFFORT.punctuate,
            });
            if (preservesWords(original, data.text)) {
              accepted = data.text;
              break;
            }
            if (attempt === 0) {
              const d = firstDivergence(original, data.text);
              user =
                `${fill(prompt.template, { span: original })}\n\n` +
                `Your previous response changed a word. You wrote "${d.got}" where the input has "${d.want}". ` +
                `That word may be a transcription error, but correcting it is not your job and it must be left exactly as it is. ` +
                `Return the same words again, changing only punctuation and casing.`;
            } else {
              rejected++;
            }
          }
        } catch {
          // A failed call is not a failed answer; count it separately so a
          // flaky invocation is never read as the model misbehaving.
          errored++;
        }

        if (accepted === null) segments.push(...span);
        else segments.push(...redistribute(span, accepted));
      }

      return {
        promptVersion: prompt.version,
        segments,
        text: segments.map((s) => s.text).join(" "),
        spansTotal: spans.length,
        spansRejected: rejected,
        spansErrored: errored,
      };
    },
  );
}
