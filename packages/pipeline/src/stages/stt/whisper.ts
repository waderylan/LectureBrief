/** Local prerecorded speech-to-text through whisper.cpp. */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { availableParallelism, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { cached } from "../../cache.js";
import { FFMPEG, WHISPER_CLI, WHISPER_MODEL } from "../../config.js";
import { loadGlossary } from "../../glossary.js";
import { Transcript, type Segment, type SourceMeta } from "../../types.js";

const exec = promisify(execFile);

const WhisperSegment = z.object({
  offsets: z.object({
    from: z.number(),
    to: z.number(),
  }),
  text: z.string(),
});

export const WhisperResponse = z.object({
  result: z.object({ language: z.string() }).passthrough(),
  transcription: z.array(WhisperSegment),
}).passthrough();
export type WhisperResponse = z.infer<typeof WhisperResponse>;

export function buildWhisperPrompt(terms: readonly string[], maxChars = 800): string {
  const selected: string[] = [];
  for (const term of terms) {
    const candidate = [...selected, term].join(", ");
    if (candidate.length > maxChars) break;
    selected.push(term);
  }
  return selected.join(", ");
}

export function transcriptFromWhisper(source: SourceMeta, response: WhisperResponse): Transcript {
  const segments: Segment[] = response.transcription
    .map((segment) => ({
      start: segment.offsets.from / 1000,
      end: segment.offsets.to / 1000,
      text: segment.text.replace(/\s+/g, " ").trim(),
      speaker: "unclear" as const,
    }))
    .filter((segment) => segment.text.length > 0);
  const text = segments.map((segment) => segment.text).join(" ");
  if (!text) {
    throw new Error(`whisper.cpp returned no transcript for ${source.localPath ?? source.url}`);
  }
  return Transcript.parse({
    source,
    segments,
    text,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  });
}

export function cacheKeyForModel(modelPath: string): string {
  return basename(modelPath).replace(/\.bin$/i, "").replace(/[^a-z0-9_-]+/gi, "-");
}

async function invokeWhisper(source: SourceMeta): Promise<WhisperResponse> {
  if (!source.localPath) {
    throw new Error(`Local source metadata is missing its media path: ${source.videoId}`);
  }
  if (!existsSync(source.localPath)) {
    throw new Error(`Local lecture file no longer exists: ${source.localPath}`);
  }
  if (!existsSync(WHISPER_CLI)) {
    throw new Error(`whisper.cpp CLI not found at ${WHISPER_CLI}. Set WHISPER_CLI or install whisper.cpp.`);
  }
  if (!existsSync(WHISPER_MODEL)) {
    throw new Error(`Whisper model not found at ${WHISPER_MODEL}. Set WHISPER_MODEL or install a GGML model.`);
  }

  const workDir = await mkdtemp(join(tmpdir(), "lecturebrief-whisper-"));
  const wavPath = join(workDir, "normalized.wav");
  const outputBase = join(workDir, "transcript");
  try {
    await exec(
      FFMPEG,
      [
        "-hide_banner", "-loglevel", "error",
        "-i", source.localPath,
        "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le",
        "-y", wavPath,
      ],
      { timeout: 30 * 60_000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 },
    );

    const args = [
      "-m", WHISPER_MODEL,
      "-f", wavPath,
      "-l", "en",
      "-t", String(Math.max(1, Math.min(8, availableParallelism() - 1))),
      "-fa",
      "-oj",
      "-of", outputBase,
      "-np",
    ];
    const prompt = buildWhisperPrompt(await loadGlossary());
    if (prompt) args.push("--prompt", prompt);
    await exec(WHISPER_CLI, args, {
      timeout: 6 * 60 * 60_000,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    });
    return WhisperResponse.parse(JSON.parse(await readFile(`${outputBase}.json`, "utf8")) as unknown);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function run(
  sourceId: string,
  source: SourceMeta,
  opts: { force?: boolean } = {},
): Promise<Transcript> {
  const stage = `stt-whisper-${cacheKeyForModel(WHISPER_MODEL)}`;
  const { data } = await cached(
    sourceId,
    stage,
    WhisperResponse,
    opts.force ?? false,
    () => invokeWhisper(source),
  );
  return transcriptFromWhisper(source, data);
}
