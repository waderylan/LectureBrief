/**
 * Stage cache. Every stage writes `.cache/<videoId>/<stage>.json` and is skipped
 * when that file exists unless `--force`.
 *
 * This is what makes iteration cheap, which is what makes the prompt work on
 * Day 6 possible at all. See ARCHITECTURE.md AD-9.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ZodType } from "zod";
import { PATHS, videoIdForWeek } from "./config.js";

const WEEK_SOURCES_FILE = "week-sources.json";

async function readWeekSources(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await readFile(join(PATHS.cache, WEEK_SOURCES_FILE), "utf8")) as Record<string, string>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

/** Generated registry that lets week commands find URL and local sources alike. */
export async function registerWeekSource(week: number, sourceId: string): Promise<void> {
  const sources = await readWeekSources();
  sources[String(week)] = sourceId;
  await mkdir(PATHS.cache, { recursive: true });
  await writeFile(join(PATHS.cache, WEEK_SOURCES_FILE), JSON.stringify(sources, null, 2), "utf8");
}

export async function sourceIdForWeek(week: number): Promise<string> {
  const registered = (await readWeekSources())[String(week)];
  return registered ?? videoIdForWeek(week);
}

export function cacheDir(videoId: string): string {
  return join(PATHS.cache, videoId);
}

export function cachePath(videoId: string, stage: string): string {
  return join(cacheDir(videoId), `${stage}.json`);
}

export function isCached(videoId: string, stage: string): boolean {
  return existsSync(cachePath(videoId, stage));
}

export async function readCache<T>(
  videoId: string,
  stage: string,
  // `ZodType<T>` alone also pins the schema's *input* type to T (its default
  // type param), so a schema with a `.default(...)` field anywhere inside it
  // — whose input and output types genuinely differ — makes T infer as a
  // mismatched hybrid instead of the parsed (output) type. Pinning Def/Input
  // to `any` here restricts inference to the output position only.
  schema: ZodType<T, any, any>,
): Promise<T> {
  const raw = await readFile(cachePath(videoId, stage), "utf8");
  return schema.parse(JSON.parse(raw));
}

export async function writeCache<T>(
  videoId: string,
  stage: string,
  data: T,
): Promise<void> {
  const p = cachePath(videoId, stage);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Run `produce` only if the stage isn't already cached. Returns the cached value
 * otherwise. `force` bypasses the cache but still writes the fresh result.
 */
export async function cached<T>(
  videoId: string,
  stage: string,
  schema: ZodType<T, any, any>,
  force: boolean,
  produce: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean }> {
  if (!force && isCached(videoId, stage)) {
    try {
      return { data: await readCache(videoId, stage, schema), fromCache: true };
    } catch {
      // A cache written before the stage's schema changed is a miss, not a
      // crash. Recompute rather than making every schema edit require a manual
      // cache wipe.
    }
  }
  const data = await produce();
  await writeCache(videoId, stage, data);
  return { data, fromCache: false };
}
