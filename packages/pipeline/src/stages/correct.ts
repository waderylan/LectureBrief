/**
 * Stage: correct.
 *
 * Term substitution only, non-destructive (AD-3). The raw transcript is kept;
 * every change is logged so a bad correction is diagnosable rather than
 * invisible.
 *
 * The model reports distinct wrong forms; this code applies each one everywhere
 * it appears and records a log entry per occurrence with its timestamp. Asking
 * the model to enumerate occurrences and their timestamps costs tokens and gets
 * them wrong; finding them mechanically does not.
 */

import { z } from "zod";
import { callJson } from "../llm.js";
import { loadPrompt, fill } from "../prompts.js";
import { loadGlossary } from "../glossary.js";
import { cached } from "../cache.js";
import { EFFORT } from "../config.js";
import { Segment, type Transcript } from "../types.js";

const Corrections = z.object({
  corrections: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      reason: z.string().default(""),
      confidence: z.enum(["high", "low"]).default("low"),
    }),
  ),
});

const Proposal = z.object({
  from: z.string(),
  to: z.string(),
  reason: z.string(),
  confidence: z.string(),
});

export const CorrectionEntry = z.object({
  from: z.string(),
  to: z.string(),
  timestamp: z.number(),
});

export const Corrected = z.object({
  promptVersion: z.string(),
  segments: z.array(Segment),
  text: z.string(),
  correctionsLog: z.array(CorrectionEntry),
  /** Distinct substitutions the model proposed, before application. */
  /** Substitutions actually applied. */
  proposed: z.array(Proposal),
  /** Low-confidence suggestions, surfaced for review but never applied. */
  skipped: z.array(Proposal),
});
export type Corrected = z.infer<typeof Corrected>;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word, case-insensitive, preserving leading capitalization. */
function applySubstitution(text: string, from: string, to: string): { text: string; count: number } {
  const re = new RegExp(`\\b${escapeRe(from)}\\b`, "gi");
  let count = 0;
  const out = text.replace(re, (m) => {
    count++;
    return m[0] === m[0]?.toUpperCase() ? to[0]?.toUpperCase() + to.slice(1) : to;
  });
  return { text: out, count };
}

export async function run(
  videoId: string,
  transcript: Transcript,
  opts: { force?: boolean } = {},
): Promise<{ data: Corrected; fromCache: boolean }> {
  return cached(videoId, "corrected", Corrected, opts.force ?? false, async () => {
    const glossary = await loadGlossary();
    const prompt = await loadPrompt("correct");

    const { data } = await callJson(Corrections, {
      system: prompt.system,
      user: fill(prompt.template, {
        glossary: glossary.join(", "),
        transcript: transcript.text,
      }),
      effort: EFFORT.correct,
    });

    // Apply only substitutions that are high confidence, actually occur, and
    // change something. Low-confidence guesses are recorded but never applied:
    // a confident falsehood reads as correct and survives review, whereas a
    // visible transcription error does not.
    const occurring = data.corrections.filter(
      (c) =>
        c.from.toLowerCase() !== c.to.toLowerCase() &&
        new RegExp(`\\b${escapeRe(c.from)}\\b`, "i").test(transcript.text),
    );
    const proposed = occurring.filter((c) => c.confidence === "high");
    const skipped = occurring.filter((c) => c.confidence !== "high");

    const correctionsLog: z.infer<typeof CorrectionEntry>[] = [];
    const segments = transcript.segments.map((seg) => {
      let text = seg.text;
      for (const c of proposed) {
        const r = applySubstitution(text, c.from, c.to);
        text = r.text;
        for (let i = 0; i < r.count; i++) {
          correctionsLog.push({ from: c.from, to: c.to, timestamp: seg.start });
        }
      }
      return { ...seg, text };
    });

    return {
      promptVersion: prompt.version,
      segments,
      text: segments.map((s) => s.text).join(" "),
      correctionsLog,
      proposed: proposed.map((c) => ({ ...c })),
      skipped: skipped.map((c) => ({ ...c })),
    };
  });
}
