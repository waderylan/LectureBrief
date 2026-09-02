/**
 * Stage: fetch/ingest.
 *
 * YouTube sources retain their raw timed captions. Local Voice Memos media
 * stays in place and is identified by a content hash; only metadata and later
 * transcription artifacts are written to the generated cache.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { cacheDir, writeCache } from "../cache.js";
import { FFPROBE, YT_DLP } from "../config.js";
import { SourceMeta } from "../types.js";

const exec = promisify(execFile);

const LOCAL_MEDIA_TYPES: Readonly<Record<string, string>> = {
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".webm": "audio/webm",
};

/** Accepts a full URL or a bare 11-character video id. */
export function parseVideoId(input: string): string {
  const match = input.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (match?.[1]) return match[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  throw new Error(`Could not parse a YouTube video id from: ${input}`);
}

export function isLocalSource(input: string): boolean {
  return existsSync(resolve(input));
}

export async function hashFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

async function mediaDuration(path: string): Promise<number> {
  try {
    const { stdout } = await exec(
      FFPROBE,
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
      { timeout: 30_000, windowsHide: true },
    );
    return Number(stdout.trim()) || 0;
  } catch (error) {
    throw new Error(`Could not read media metadata for ${path}. Install ffmpeg/ffprobe or set FFPROBE.`, {
      cause: error,
    });
  }
}

async function ingestLocal(input: string): Promise<SourceMeta> {
  const localPath = resolve(input);
  const info = await stat(localPath);
  if (!info.isFile()) throw new Error(`Local lecture source is not a file: ${localPath}`);

  const extension = extname(localPath).toLowerCase();
  const contentType = LOCAL_MEDIA_TYPES[extension];
  if (!contentType) {
    throw new Error(
      `Unsupported local lecture format "${extension || "(none)"}". Voice Memos .m4a files are supported, along with MP3, WAV, AAC, FLAC, OGG, Opus, MP4, MOV, and WebM.`,
    );
  }

  const contentHash = await hashFile(localPath);
  const videoId = `local-${contentHash.slice(0, 20)}`;
  const meta = SourceMeta.parse({
    videoId,
    url: pathToFileURL(localPath).href,
    title: parse(basename(localPath)).name,
    durationSec: await mediaDuration(localPath),
    fetchedAt: new Date().toISOString(),
    sourceType: "local",
    localPath,
    contentHash,
    recordedAt: info.mtime.toISOString(),
    contentType,
  });
  await writeCache(videoId, "source", meta);
  return meta;
}

async function fetchYoutube(input: string, opts: { force?: boolean }): Promise<SourceMeta> {
  const videoId = parseVideoId(input);
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const dir = cacheDir(videoId);
  await mkdir(dir, { recursive: true });

  const haveCaptions = existsSync(join(dir, `${videoId}.en.json3`));
  if (opts.force || !haveCaptions) {
    await exec(
      YT_DLP,
      [
        "--skip-download",
        "--write-auto-subs",
        "--sub-langs",
        "en",
        "--sub-format",
        "json3",
        "--no-warnings",
        "--quiet",
        "-o",
        join(dir, "%(id)s.%(ext)s"),
        url,
      ],
      { timeout: 180_000, windowsHide: true },
    );
  }

  const files = await readdir(dir);
  if (!files.some((file) => file.endsWith(".json3"))) {
    throw new Error(`No English auto-captions available for ${videoId}. Use a local media file with Deepgram STT.`);
  }

  const { stdout } = await exec(
    YT_DLP,
    ["--skip-download", "--print", "%(title)s\n%(duration)s", "--no-warnings", url],
    { timeout: 120_000, windowsHide: true },
  );
  const [title = "", duration = "0"] = stdout.trim().split("\n");
  const meta = SourceMeta.parse({
    videoId,
    url,
    title: title.trim(),
    durationSec: Number(duration) || 0,
    fetchedAt: new Date().toISOString(),
    sourceType: "youtube",
  });
  await writeCache(videoId, "source", meta);
  return meta;
}

export async function run(input: string, opts: { force?: boolean } = {}): Promise<SourceMeta> {
  return isLocalSource(input) ? ingestLocal(input) : fetchYoutube(input, opts);
}

/** Raw json3 caption payload for `transcribe` to normalize. */
export async function readCaptions(videoId: string): Promise<unknown> {
  const dir = cacheDir(videoId);
  const files = await readdir(dir);
  const file = files.find((candidate) => candidate.endsWith(".json3"));
  if (!file) throw new Error(`No captions cached for ${videoId}. Run 'brief fetch' first.`);
  return JSON.parse(await readFile(join(dir, file), "utf8"));
}
