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
  /** Defaults keep pre-local-file cache entries readable. */
  sourceType: z.enum(["youtube", "local"]).default("youtube"),
  localPath: z.string().optional(),
  contentHash: z.string().optional(),
  recordedAt: z.string().optional(),
  contentType: z.string().optional(),
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
  /** Provider diarization label; it is not guessed into a semantic role. */
  speakerId: z.number().int().nonnegative().optional(),
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

/** Shape produced by the correction stage, re-declared here to avoid a cycle. */
export interface Corrected {
  segments: Segment[];
  text: string;
}
