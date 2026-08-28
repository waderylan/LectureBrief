/**
 * Stage: redact.
 *
 * Strips marked material from the transcript **before** anything extraction-
 * facing sees it (ARCHITECTURE.md §7.2). Extracting first and filtering
 * afterwards would leave off-record content in a JSON file, in the cache, and
 * possibly in git history.
 *
 * Redactions live in `redactions/<videoId>.yml`:
 *
 *   ranges:
 *     - { start: 1200, end: 1260, note: "why" }
 *   strings:
 *     - "literal text to remove"
 *
 * A missing file means nothing is redacted, which is the correct default for
 * public conference talks.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { cached } from "../cache.js";
import { PATHS } from "../config.js";
import { Segment, type Corrected } from "../types.js";

const RedactionFile = z.object({
  ranges: z
    .array(z.object({ start: z.number(), end: z.number(), note: z.string().default("") }))
    .default([]),
  strings: z.array(z.string()).default([]),
});

export const Redacted = z.object({
  segments: z.array(Segment),
  text: z.string(),
  removedSegments: z.number(),
  removedStrings: z.number(),
});
export type Redacted = z.infer<typeof Redacted>;

export function redactionPath(videoId: string): string {
  return join(PATHS.redactions, `${videoId}.yml`);
}

export async function run(
  videoId: string,
  corrected: Pick<Corrected, "segments">,
  opts: { force?: boolean } = {},
): Promise<{ data: Redacted; fromCache: boolean }> {
  return cached(videoId, "redacted", Redacted, opts.force ?? false, async () => {
    const p = redactionPath(videoId);
    const cfg = existsSync(p)
      ? RedactionFile.parse(parse(await readFile(p, "utf8")) ?? {})
      : RedactionFile.parse({});

    let removedStrings = 0;

    // Drop any segment overlapping a redacted range.
    const kept = corrected.segments.filter(
      (s) => !cfg.ranges.some((r) => s.start < r.end && s.end > r.start),
    );
    const removedSegments = corrected.segments.length - kept.length;

    const segments = kept.map((s) => {
      let text = s.text;
      for (const lit of cfg.strings) {
        if (!lit) continue;
        const parts = text.split(lit);
        if (parts.length > 1) {
          removedStrings += parts.length - 1;
          text = parts.join(" ").replace(/\s+/g, " ").trim();
        }
      }
      return { ...s, text };
    });

    return {
      segments,
      text: segments.map((s) => s.text).join(" "),
      removedSegments,
      removedStrings,
    };
  });
}
