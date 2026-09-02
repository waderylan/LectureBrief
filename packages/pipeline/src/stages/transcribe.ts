/**
 * Stage: transcribe.
 *
 * YouTube captions and Deepgram output from local media normalize into the
 * same timestamped Transcript artifact. Provider speaker numbers are retained,
 * but never guessed into instructor/student roles.
 */

import { readFile } from "node:fs/promises";
import { z } from "zod";
import { cached } from "../cache.js";
import { SEGMENT_MAX_CHARS, WHISPER_MODEL } from "../config.js";
import { loadGlossary } from "../glossary.js";
import { Transcript, type Segment, type SourceMeta } from "../types.js";
import { readCaptions } from "./fetch.js";
import * as whisper from "./stt/whisper.js";

interface Json3Seg {
  utf8?: string;
}
interface Json3Event {
  tStartMs?: number;
  dDurationMs?: number;
  segs?: Json3Seg[];
}

/** Caption events are word fragments; group them into readable segments. */
export function youtubeSegments(events: Json3Event[]): Segment[] {
  const output: Segment[] = [];
  let buffer: string[] = [];
  let start = 0;
  let end = 0;

  const flush = () => {
    const text = buffer.join(" ").replace(/\s+/g, " ").trim();
    if (text) output.push({ start, end, text, speaker: "unclear" });
    buffer = [];
  };

  for (const event of events) {
    const words = (event.segs ?? []).map((segment) => (segment.utf8 ?? "").trim()).filter(Boolean);
    if (words.length === 0) continue;
    const timestamp = (event.tStartMs ?? 0) / 1000;
    if (buffer.length === 0) start = timestamp;
    end = timestamp + (event.dDurationMs ?? 0) / 1000;
    buffer.push(...words);
    if (buffer.join(" ").length >= SEGMENT_MAX_CHARS) flush();
  }
  flush();
  return output;
}

const DeepgramUtterance = z.object({
  start: z.number(),
  end: z.number(),
  transcript: z.string(),
  speaker: z.number().int().nonnegative().optional(),
});

export const DeepgramResponse = z.object({
  metadata: z.object({ duration: z.number().optional() }).passthrough(),
  results: z.object({
    utterances: z.array(DeepgramUtterance).optional(),
    channels: z.array(z.object({
      alternatives: z.array(z.object({
        transcript: z.string(),
        words: z.array(z.object({
          start: z.number(),
          end: z.number(),
          punctuated_word: z.string().optional(),
          word: z.string(),
          speaker: z.number().int().nonnegative().optional(),
        })).optional(),
      })),
    })).optional(),
  }),
});
export type DeepgramResponse = z.infer<typeof DeepgramResponse>;

export const DEEPGRAM_KEYTERM_LIMIT = 100;

export function selectDeepgramKeyterms(terms: readonly string[]): string[] {
  return terms.slice(0, DEEPGRAM_KEYTERM_LIMIT);
}

function wordsToSegments(response: DeepgramResponse): Segment[] {
  const words = response.results.channels?.[0]?.alternatives[0]?.words ?? [];
  const segments: Segment[] = [];
  let current: Segment | undefined;
  for (const word of words) {
    const text = word.punctuated_word ?? word.word;
    if (!current || current.speakerId !== word.speaker || `${current.text} ${text}`.length > SEGMENT_MAX_CHARS) {
      current = { start: word.start, end: word.end, text, speaker: "unclear", speakerId: word.speaker };
      segments.push(current);
    } else {
      current.text += ` ${text}`;
      current.end = word.end;
    }
  }
  return segments;
}

export function transcriptFromDeepgram(source: SourceMeta, response: DeepgramResponse): Transcript {
  const utterances = response.results.utterances ?? [];
  const segments: Segment[] = utterances.length > 0
    ? utterances
        .filter((utterance) => utterance.transcript.trim())
        .map((utterance) => ({
          start: utterance.start,
          end: utterance.end,
          text: utterance.transcript.replace(/\s+/g, " ").trim(),
          speaker: "unclear" as const,
          speakerId: utterance.speaker,
        }))
    : wordsToSegments(response);
  const text = segments.map((segment) => segment.text).join(" ");
  if (!text) throw new Error(`Deepgram returned no transcript for ${source.localPath ?? source.url}`);
  return Transcript.parse({
    source: { ...source, durationSec: response.metadata.duration ?? source.durationSec },
    segments,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  });
}

async function transcribeLocal(sourceId: string, source: SourceMeta, force: boolean): Promise<Transcript> {
  const key = process.env["DEEPGRAM_API_KEY"];
  if (!key) throw new Error("Local lecture transcription requires DEEPGRAM_API_KEY in .env.");
  if (!source.localPath || !source.contentType) throw new Error(`Local source metadata is incomplete for ${sourceId}`);
  const localPath = source.localPath;
  const contentType = source.contentType;

  const { data: response } = await cached(sourceId, "stt-deepgram", DeepgramResponse, force, async () => {
    const params = new URLSearchParams({
      model: process.env["DEEPGRAM_MODEL"] || "nova-3",
      language: "en",
      smart_format: "true",
      utterances: "true",
      diarize_model: "latest",
    });
    for (const term of selectDeepgramKeyterms(await loadGlossary())) params.append("keyterm", term);
    const result = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
      method: "POST",
      headers: { Authorization: `Token ${key}`, "Content-Type": contentType },
      body: await readFile(localPath),
      signal: AbortSignal.timeout(30 * 60_000),
    });
    const raw: unknown = await result.json().catch(() => null);
    if (!result.ok) {
      const detail = raw && typeof raw === "object" ? JSON.stringify(raw) : result.statusText;
      throw new Error(`Deepgram transcription failed (${result.status}): ${detail}`);
    }
    return DeepgramResponse.parse(raw);
  });
  return transcriptFromDeepgram(source, response);
}

export type LocalSttProvider = "whisper" | "deepgram";

export function localSttProvider(value = process.env["STT_PROVIDER"]): LocalSttProvider {
  const provider = value?.trim().toLowerCase() || "whisper";
  if (provider === "whisper" || provider === "deepgram") return provider;
  throw new Error(`Unsupported STT_PROVIDER "${value}". Use "whisper" or "deepgram".`);
}

export async function run(
  sourceId: string,
  source: SourceMeta,
  opts: { force?: boolean } = {},
): Promise<{ data: Transcript; fromCache: boolean }> {
  const provider = source.sourceType === "local" ? localSttProvider() : "youtube";
  const modelKey = whisper.cacheKeyForModel(WHISPER_MODEL);
  const transcriptStage = provider === "youtube"
    ? "transcript"
    : provider === "whisper"
      ? `transcript-whisper-${modelKey}`
      : "transcript-deepgram";
  return cached(sourceId, transcriptStage, Transcript, opts.force ?? false, async () => {
    if (provider === "whisper") return whisper.run(sourceId, source, { force: opts.force });
    if (provider === "deepgram") return transcribeLocal(sourceId, source, opts.force ?? false);
    const raw = (await readCaptions(sourceId)) as { events?: Json3Event[] };
    const segments = youtubeSegments(raw.events ?? []);
    const text = segments.map((segment) => segment.text).join(" ");
    return {
      source,
      segments,
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    };
  });
}
