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
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cached, isCached, readCache } from "../cache.js";
import { slideDeckForVideo } from "../config.js";

export const SlideText = z.object({
  url: z.string(),
  pageCount: z.number(),
  text: z.string(),
});
export type SlideText = z.infer<typeof SlideText>;

export async function run(
  videoId: string,
  opts: { force?: boolean; source?: string } = {},
): Promise<{ data: SlideText; fromCache: boolean }> {
  const requested = opts.source ?? slideDeckForVideo(videoId);
  const localPath = resolve(requested);
  const local = existsSync(localPath);
  const url = local ? pathToFileURL(localPath).href : requested;
  const previous = isCached(videoId, "slides")
    ? await readCache(videoId, "slides", SlideText).catch(() => null)
    : null;
  const force = opts.force || (previous !== null && previous.url !== url);

  return cached(videoId, "slides", SlideText, force ?? false, async () => {
    let buf: Uint8Array;
    if (local) {
      if (!localPath.toLowerCase().endsWith(".pdf")) throw new Error(`Slide deck must be a PDF: ${localPath}`);
      buf = new Uint8Array(await readFile(localPath));
    } else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`slides: fetching ${url} returned HTTP ${res.status}`);
      buf = new Uint8Array(await res.arrayBuffer());
    }
    const pdf = await getDocumentProxy(buf);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    return {
      url,
      pageCount: totalPages,
      text: text.replace(/\s+/g, " ").trim(),
    };
  });
}
