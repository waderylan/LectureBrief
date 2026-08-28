/**
 * Grounding invariants, BUILD_PLAN.md Day 4 / ARCHITECTURE.md §5.
 *
 * Run against the real cached extraction output for all three talks, not a
 * synthetic fixture — per BUILD_PLAN.md's Day 4 item, "every evidence is an
 * exact substring of the corrected transcript" is exactly the claim
 * `extract.ts` already relies on internally to derive timestamps (see
 * `buildTranscriptIndex`/`timestampFor` there), so this test holds the
 * pipeline to the same standard a reader can check by hand.
 *
 * These read `.cache/<videoId>/{punctuated,extract}.json` directly.
 * `.cache/` is gitignored and produced by running the pipeline (see
 * ARCHITECTURE.md AD-9) — on this one-operator, one-laptop project that is
 * the real artifact under test, not a substitute for one. A clone without
 * `.cache/` populated skips these rather than failing.
 */

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { TALK_WEEKS, NAME_BLOCKLIST } from "../src/config.js";
import { cachePath } from "../src/cache.js";
import { ExtractResult, normalizeWs } from "../src/stages/extract.js";

const PunctuatedText = { text: "" };
type PunctuatedText = typeof PunctuatedText;

for (const [week, videoId] of Object.entries(TALK_WEEKS)) {
  const extractPath = cachePath(videoId, "extract");
  const punctPath = cachePath(videoId, "punctuated");
  const haveCache = existsSync(extractPath) && existsSync(punctPath);

  describe.skipIf(!haveCache)(`week ${week} (${videoId}) grounding invariants`, () => {
    const extract = ExtractResult.parse(JSON.parse(readFileSync(extractPath, "utf8")));
    const punctuated = JSON.parse(readFileSync(punctPath, "utf8")) as PunctuatedText;
    const transcript = normalizeWs(punctuated.text);

    const allInsights = [extract.leadInsight, ...extract.insights];

    it("every insight's evidence is an exact substring of the corrected transcript", () => {
      for (const insight of allInsights) {
        expect(transcript.includes(normalizeWs(insight.evidence))).toBe(true);
      }
    });

    it("every published build idea has non-empty origin.evidence, verbatim in the transcript", () => {
      for (const idea of extract.buildIdeas) {
        expect(idea.origin.evidence.length).toBeGreaterThan(0);
        expect(transcript.includes(normalizeWs(idea.origin.evidence))).toBe(true);
      }
    });

    it("every published agent prompt has non-empty origin.evidence, verbatim in the transcript", () => {
      for (const prompt of extract.agentPrompts) {
        expect(prompt.origin.evidence.length).toBeGreaterThan(0);
        expect(transcript.includes(normalizeWs(prompt.origin.evidence))).toBe(true);
      }
    });

    it("no blocklisted speaker name appears anywhere in the extraction output", () => {
      const serialized = JSON.stringify(extract).toLowerCase();
      for (const name of NAME_BLOCKLIST) {
        expect(serialized.includes(name.toLowerCase())).toBe(false);
      }
    });
  });
}
