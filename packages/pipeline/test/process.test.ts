import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  const stage = (name: string, data: unknown) => vi.fn(async () => {
    calls.push(name);
    return { data, fromCache: false };
  });
  return {
    calls,
    register: vi.fn(async () => { calls.push("register"); }),
    assignments: vi.fn(async () => "assignments"),
    fetch: vi.fn(async () => {
      calls.push("ingest");
      return {
        videoId: "local-hash",
        url: "file:///lecture.m4a",
        title: "Voice Memo",
        durationSec: 100,
        fetchedAt: "2026-09-01T00:00:00.000Z",
        recordedAt: "2026-08-31T20:00:00.000Z",
        sourceType: "local",
      };
    }),
    transcribe: stage("transcribe", { transcript: true }),
    correct: stage("correct", { corrected: true }),
    redact: stage("redact", { redacted: true }),
    punctuate: stage("punctuate", { text: "text", segments: [] }),
    slides: stage("slides", { text: "slides" }),
    extract: stage("extract", { extracted: true }),
    verify: stage("verify", { verified: true }),
    assemble: vi.fn(async () => {
      calls.push("assemble");
      return { data: { status: "draft" }, path: "content/lecture-04.draft.json" };
    }),
  };
});

vi.mock("../src/cache.js", () => ({ registerWeekSource: mocks.register }));
vi.mock("../src/glossary.js", () => ({ loadAssignments: mocks.assignments }));
vi.mock("../src/stages/fetch.js", () => ({ run: mocks.fetch }));
vi.mock("../src/stages/transcribe.js", () => ({ run: mocks.transcribe }));
vi.mock("../src/stages/correct.js", () => ({ run: mocks.correct }));
vi.mock("../src/stages/redact.js", () => ({ run: mocks.redact }));
vi.mock("../src/stages/punctuate.js", () => ({ run: mocks.punctuate }));
vi.mock("../src/stages/slides.js", () => ({ run: mocks.slides }));
vi.mock("../src/stages/extract.js", () => ({ run: mocks.extract }));
vi.mock("../src/stages/verify.js", () => ({ run: mocks.verify }));
vi.mock("../src/stages/assemble.js", () => ({ run: mocks.assemble }));

import { run } from "../src/stages/process.js";

describe("brief process", () => {
  beforeEach(() => {
    mocks.calls.length = 0;
    vi.clearAllMocks();
  });

  it.each(["C:/Lectures/Week 4.m4a", "https://www.youtube.com/watch?v=zOkou37L2Wo"])(
    "runs source %s through every stage in safety order",
    async (source) => {
      const result = await run(source, { slides: "C:/Lectures/Week 4.pdf", week: 4 });
      expect(result.data.status).toBe("draft");
      expect(mocks.fetch).toHaveBeenCalledWith(source, { force: undefined });
      expect(mocks.register).toHaveBeenCalledWith(4, "local-hash");
      expect(mocks.calls).toEqual([
        "ingest", "register", "transcribe", "correct", "redact",
        "punctuate", "slides", "extract", "verify", "assemble",
      ]);
      expect(mocks.assemble).toHaveBeenCalledWith("local-hash", 4, {
        title: "Voice Memo",
        date: "2026-08-31",
      });
    },
  );

  it("rejects invalid week numbers before touching the source", async () => {
    await expect(run("lecture.m4a", { slides: "slides.pdf", week: 0 })).rejects.toThrow("positive integer");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
