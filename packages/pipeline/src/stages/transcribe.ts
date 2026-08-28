/**
 * Stage: transcribe.
 *
 * Normalizes YouTube json3 auto-captions into the transcript shape. This is not
 * speech-to-text — the recognition already happened; this stage only reshapes.
 * If paid STT is reinstated it replaces this file and nothing downstream changes.
 *
 * Auto-captions carry no speaker labels, so every segment is `unclear` (AD-2).
 */

import { cached } from "../cache.js";
import { readCaptions } from "./fetch.js";
import { Transcript, type Segment, type SourceMeta } from "../types.js";
import { SEGMENT_MAX_CHARS } from "../config.js";

interface Json3Seg {
  utf8?: string;
}
interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Json3Seg[];
}

/** Caption events are word-fragments; group them into readable segments. */
function toSegments(events: Json3Event[]): Segment[] {
  const out: Segment[] = [];
  let buf: string[] = [];
  let start = 0;
  let end = 0;

  const flush = () => {
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (text) out.push({ start, end, text, speaker: "unclear" });
    buf = [];
  };

  for (const e of events) {
    const words = (e.segs ?? [])
      .map((s) => (s.utf8 ?? "").trim())
      .filter(Boolean);
    if (words.length === 0) continue;

    const t = (e.tStartMs ?? 0) / 1000;
    if (buf.length === 0) start = t;
    end = t + (e.dDurationMs ?? 0) / 1000;
    buf.push(...words);

    if (buf.join(" ").length >= SEGMENT_MAX_CHARS) flush();
  }
  flush();
  return out;
}

export async function run(
  videoId: string,
  source: SourceMeta,
  opts: { force?: boolean } = {},
): Promise<{ data: Transcript; fromCache: boolean }> {
  return cached(videoId, "transcript", Transcript, opts.force ?? false, async () => {
    const raw = (await readCaptions(videoId)) as { events?: Json3Event[] };
    const segments = toSegments(raw.events ?? []);
    const text = segments.map((s) => s.text).join(" ");
    return {
      source,
      segments,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    };
  });
}
