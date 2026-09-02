import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { hashFile, parseVideoId } from "../src/stages/fetch.js";
import { SourceMeta } from "../src/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("lecture source identity", () => {
  it("derives identity from bytes rather than filename", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lecturebrief-source-"));
    tempDirs.push(dir);
    const first = join(dir, "Voice Memo.m4a");
    const renamed = join(dir, "Week 4.m4a");
    await writeFile(first, "same recording bytes");
    await writeFile(renamed, "same recording bytes");
    expect(await hashFile(first)).toBe(await hashFile(renamed));
  });

  it("keeps old YouTube source caches schema-compatible", () => {
    const parsed = SourceMeta.parse({
      videoId: "zOkou37L2Wo",
      url: "https://www.youtube.com/watch?v=zOkou37L2Wo",
      title: "Talk",
      durationSec: 60,
      fetchedAt: "2026-08-27T00:00:00.000Z",
    });
    expect(parsed.sourceType).toBe("youtube");
  });

  it("parses supported YouTube source forms", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=zOkou37L2Wo")).toBe("zOkou37L2Wo");
    expect(parseVideoId("zOkou37L2Wo")).toBe("zOkou37L2Wo");
  });
});
