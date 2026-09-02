import { describe, expect, it } from "vitest";
import {
  DEEPGRAM_KEYTERM_LIMIT,
  DeepgramResponse,
  localSttProvider,
  selectDeepgramKeyterms,
  transcriptFromDeepgram,
} from "../src/stages/transcribe.js";
import { SourceMeta } from "../src/types.js";

const source = SourceMeta.parse({
  videoId: "local-abc",
  url: "file:///lecture.m4a",
  title: "Week 4",
  durationSec: 10,
  fetchedAt: "2026-09-01T00:00:00.000Z",
  sourceType: "local",
  localPath: "C:/lecture.m4a",
  contentType: "audio/mp4",
});

describe("Deepgram transcript normalization", () => {
  it("uses local Whisper by default and validates provider overrides", () => {
    expect(localSttProvider(undefined)).toBe("whisper");
    expect(localSttProvider("deepgram")).toBe("deepgram");
    expect(() => localSttProvider("unknown")).toThrow("Unsupported STT_PROVIDER");
  });

  it("stays within Deepgram's per-request keyterm limit", () => {
    const terms = Array.from({ length: 132 }, (_, index) => `term-${index}`);
    expect(selectDeepgramKeyterms(terms)).toHaveLength(DEEPGRAM_KEYTERM_LIMIT);
    expect(selectDeepgramKeyterms(terms)[99]).toBe("term-99");
  });

  it("fits diarized utterances into the existing transcript schema", () => {
    const response = DeepgramResponse.parse({
      metadata: { duration: 12.5 },
      results: {
        utterances: [
          { start: 0.2, end: 4.1, transcript: "First lecture point.", speaker: 0 },
          { start: 5, end: 8.4, transcript: "A student question.", speaker: 1 },
        ],
      },
    });
    const transcript = transcriptFromDeepgram(source, response);
    expect(transcript.source.durationSec).toBe(12.5);
    expect(transcript.text).toBe("First lecture point. A student question.");
    expect(transcript.segments).toEqual([
      { start: 0.2, end: 4.1, text: "First lecture point.", speaker: "unclear", speakerId: 0 },
      { start: 5, end: 8.4, text: "A student question.", speaker: "unclear", speakerId: 1 },
    ]);
  });

  it("falls back to timestamped words when utterances are absent", () => {
    const response = DeepgramResponse.parse({
      metadata: {},
      results: { channels: [{ alternatives: [{ transcript: "Hello world.", words: [
        { start: 0, end: 0.4, word: "hello", punctuated_word: "Hello", speaker: 0 },
        { start: 0.5, end: 1, word: "world", punctuated_word: "world.", speaker: 0 },
      ] }] }] },
    });
    expect(transcriptFromDeepgram(source, response).segments[0]?.text).toBe("Hello world.");
  });
});
