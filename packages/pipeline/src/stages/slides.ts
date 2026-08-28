/**
 * Stage: slides.
 *
 * Downloads a talk's separately published slide deck and extracts its text
 * with `unpdf` — no Python dependency for this (BUILD_PLAN.md §2). The text
 * feeds the extract stage's AD-5 three-way slide comparison; it is never
 * published on its own.
 */

import { z } from "zod";
import { extractText, getDocumentProxy } from "unpdf";
import { cached } from "../cache.js";
import { slideDeckForVideo } from "../config.js";

export const SlideText = z.object({
  url: z.string(),
  pageCount: z.number(),
  text: z.string(),
});
export type SlideText = z.infer<typeof SlideText>;

export async function run(
  videoId: string,
  opts: { force?: boolean } = {},
): Promise<{ data: SlideText; fromCache: boolean }> {
  return cached(videoId, "slides", SlideText, opts.force ?? false, async () => {
    const url = slideDeckForVideo(videoId);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`slides: fetching ${url} returned HTTP ${res.status}`);

    const buf = new Uint8Array(await res.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    return {
      url,
      pageCount: totalPages,
      text: text.replace(/\s+/g, " ").trim(),
    };
  });
}
