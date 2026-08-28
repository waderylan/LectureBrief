/**
 * The merge makes the word-sequence invariant true by construction: the output
 * is assembled from the original word array, so no model output can violate it.
 *
 * These tests therefore assert the property directly — feed deliberately
 * misbehaving "model output" and check the words still come back untouched.
 */

import { describe, expect, it } from "vitest";
import { mergePunctuation } from "../src/punctmerge.js";
import { preservesWords } from "../src/stages/punctuate.js";

const words = (s: string) => s.split(/\s+/).filter(Boolean);

describe("punctuation merge", () => {
  it("transplants punctuation and casing onto the original words", () => {
    const orig = words("so we spent four weeks on this it was not dns");
    const model = "So we spent four weeks on this. It was not DNS.";
    const { text, unmatched } = mergePunctuation(orig, model);
    // The model uppercased the acronym; casing is within this pass's remit.
    expect(text).toBe("So we spent four weeks on this. It was not DNS.");
    expect(unmatched).toBe(0);
  });

  it("keeps the original word when the model silently fixes a transcription error", () => {
    const orig = words("we started syn floating ourselves");
    const { text, unmatched } = mergePunctuation(orig, "We started syn flooding ourselves.");
    expect(text).toContain("floating");
    expect(text).not.toContain("flooding");
    expect(unmatched).toBe(1);
  });

  it("restores filler the model deleted", () => {
    const orig = words("so um we spent you know four weeks");
    const { text } = mergePunctuation(orig, "So we spent four weeks.");
    expect(preservesWords(orig.join(" "), text)).toBe(true);
    expect(text).toContain("um");
    expect(text).toContain("you know");
  });

  it("drops words the model invented", () => {
    const orig = words("it was conntrack");
    const { text } = mergePunctuation(orig, "It was actually conntrack.");
    expect(preservesWords(orig.join(" "), text)).toBe(true);
    expect(text).not.toContain("actually");
  });

  it("survives a word join and a word split", () => {
    const orig = words("node local dns and m54x large");
    const { text } = mergePunctuation(orig, "Nodelocal DNS, and m5 4x large.");
    expect(preservesWords(orig.join(" "), text)).toBe(true);
  });

  it("preserves an all-caps token's casing", () => {
    const orig = words("we hit DNS and RPF");
    const { text } = mergePunctuation(orig, "we hit dns and rpf.");
    expect(text).toContain("DNS");
    expect(text).toContain("RPF");
  });

  it("holds the invariant against wholesale paraphrase", () => {
    const orig = words("so we spent four weeks on this it was not dns it was conntrack");
    const { text } = mergePunctuation(
      orig,
      "The team investigated for a month before discovering the real cause.",
    );
    expect(preservesWords(orig.join(" "), text)).toBe(true);
  });

  it("holds the invariant against empty output", () => {
    const orig = words("it was not dns");
    const { text } = mergePunctuation(orig, "");
    expect(preservesWords(orig.join(" "), text)).toBe(true);
  });
});
