/**
 * Stage: fetch.
 *
 * Pulls YouTube auto-captions (json3, which carries timing) plus video metadata.
 * No audio download and no paid STT — see BUILD_PLAN.md §5. The `.json3` file is
 * kept raw so `transcribe` can be re-run without re-fetching.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cacheDir, writeCache } from "../cache.js";
import { SourceMeta } from "../types.js";
import { YT_DLP } from "../config.js";

const exec = promisify(execFile);

/** Accepts a full URL or a bare 11-character video id. */
export function parseVideoId(input: string): string {
  const m = input.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  if (m?.[1]) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
  throw new Error(`Could not parse a YouTube video id from: ${input}`);
}

export async function run(
  input: string,
  opts: { force?: boolean } = {},
): Promise<SourceMeta> {
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
  if (!files.some((f) => f.endsWith(".json3"))) {
    throw new Error(
      `No English auto-captions available for ${videoId}. This talk cannot be used without paid STT.`,
    );
  }

  const { stdout } = await exec(
    YT_DLP,
    ["--skip-download", "--print", "%(title)s\n%(duration)s", "--no-warnings", url],
    { timeout: 120_000, windowsHide: true },
  );
  const [title = "", duration = "0"] = stdout.trim().split("\n");

  const meta: SourceMeta = {
    videoId,
    url,
    title: title.trim(),
    durationSec: Number(duration) || 0,
    fetchedAt: new Date().toISOString(),
  };
  await writeCache(videoId, "source", meta);
  return meta;
}

/** Raw json3 caption payload for `transcribe` to normalize. */
export async function readCaptions(videoId: string): Promise<unknown> {
  const dir = cacheDir(videoId);
  const files = await readdir(dir);
  const f = files.find((x) => x.endsWith(".json3"));
  if (!f) throw new Error(`No captions cached for ${videoId}. Run 'brief fetch' first.`);
  return JSON.parse(await readFile(join(dir, f), "utf8"));
}
