/**
 * Intermediate pipeline artifacts. These are not the published data contract —
 * that lives in `@lecturebrief/schema` and is what the site imports.
 */

import { z } from "zod";

export const SourceMeta = z.object({
  videoId: z.string(),
  url: z.string(),
  title: z.string(),
  durationSec: z.number(),
  fetchedAt: z.string(),
});
export type SourceMeta = z.infer<typeof SourceMeta>;

export const Segment = z.object({
  /** Seconds from the start of the talk. */
  start: z.number(),
  end: z.number(),
  text: z.string(),
  /**
   * Auto-captions carry no diarization. ARCHITECTURE.md AD-2 says default to
   * "unclear" rather than guessing "instructor".
   */
  speaker: z.enum(["instructor", "student", "unclear"]).default("unclear"),
});
export type Segment = z.infer<typeof Segment>;

export const Transcript = z.object({
  source: SourceMeta,
  segments: z.array(Segment),
  /** Whole transcript as one string. Evidence spans are matched against this. */
  text: z.string(),
  wordCount: z.number(),
});
export type Transcript = z.infer<typeof Transcript>;
