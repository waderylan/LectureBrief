import { describe, expect, it } from "vitest";
import {
  WhisperResponse,
  buildWhisperPrompt,
  transcriptFromWhisper,
} from "../src/stages/stt/whisper.js";
import { SourceMeta } from "../src/types.js";

const source = SourceMeta.parse({
  videoId: "local-abc",
  url: "file:///lecture.m4a",
  title: "Week 4",
  durationSec: 12,
  fetchedAt: "2026-09-01T00:00:00.000Z",
  sourceType: "local",
  localPath: "C:/lecture.m4a",
  contentType: "audio/mp4",
});

describe("whisper.cpp transcript normalization", () => {
  it("maps millisecond offsets into the existing timestamped schema", () => {
    const response = WhisperResponse.parse({
      result: { language: "en" },
      transcription: [
        { offsets: { from: 0, to: 4200 }, text: " First point." },
        { offsets: { from: 4300, to: 8100 }, text: " Second point. " },
      ],
    });
    const transcript = transcriptFromWhisper(source, response);
    expect(transcript.text).toBe("First point. Second point.");
    expect(transcript.segments).toEqual([
      { start: 0, end: 4.2, text: "First point.", speaker: "unclear" },
      { start: 4.3, end: 8.1, text: "Second point.", speaker: "unclear" },
    ]);
  });

  it("builds a bounded whole-term glossary prompt", () => {
    expect(buildWhisperPrompt(["MCP", "LangGraph", "a term that does not fit"], 16)).toBe("MCP, LangGraph");
  });

  it("rejects an empty transcription", () => {
    const response = WhisperResponse.parse({ result: { language: "en" }, transcription: [] });
    expect(() => transcriptFromWhisper(source, response)).toThrow("returned no transcript");
  });
});
