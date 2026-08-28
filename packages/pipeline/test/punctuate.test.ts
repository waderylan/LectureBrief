/**
 * The punctuation invariant.
 *
 * This is what makes AD-3's non-destructive guarantee provable rather than
 * merely instructed. Punctuation and casing may change; the word sequence may
 * not. Everything the prompt forbids — dropping filler, fixing grammar,
 * paraphrasing, expanding contractions — is a word-sequence change, so it fails
 * here without needing a rule of its own.
 */

import { describe, expect, it } from "vitest";
import { preservesWords, wordSignature } from "../src/stages/punctuate.js";

const RAW =
  "so we spent four weeks on this um the logs said DNS it was not DNS you know it was conntrack";

describe("punctuation invariant", () => {
  it("accepts inserted punctuation and casing changes", () => {
    const ok =
      "So we spent four weeks on this, um, the logs said DNS. It was not DNS, you know, it was conntrack.";
    expect(preservesWords(RAW, ok)).toBe(true);
  });

  it("rejects removed filler", () => {
    const bad =
      "So we spent four weeks on this. The logs said DNS. It was not DNS, it was conntrack.";
    expect(preservesWords(RAW, bad)).toBe(false);
  });

  it("rejects paraphrase", () => {
    const bad =
      "We spent four weeks investigating. The logs indicated DNS, but it was actually conntrack.";
    expect(preservesWords(RAW, bad)).toBe(false);
  });

  it("rejects an expanded contraction", () => {
    expect(preservesWords("it is not DNS", "it's not DNS.")).toBe(false);
  });

  it("accepts an inserted possessive apostrophe", () => {
    // The prompt permits apostrophes, so adding one must not read as a word
    // split. This was a real false-rejection before apostrophes were deleted
    // rather than replaced with a space during normalization.
    expect(preservesWords("the kernels reverse path filtering", "the kernel's reverse path filtering.")).toBe(true);
    expect(preservesWords("one of datadogs products", "One of Datadog's products.")).toBe(true);
  });

  it("still rejects a word split or join", () => {
    expect(preservesWords("node local dns", "nodelocal dns")).toBe(false);
    expect(preservesWords("m54x large", "m5 4x large")).toBe(false);
  });

  it("rejects a silently fixed transcription error", () => {
    // Correct fixes, but they belong to the logged correction pass, not here.
    expect(preservesWords("our regress flows", "our egress flows.")).toBe(false);
    expect(preservesWords("we started syn floating", "we started syn flooding.")).toBe(false);
  });

  it("rejects reordering", () => {
    expect(preservesWords("DNS was not it", "It was not DNS.")).toBe(false);
  });

  it("rejects an added word", () => {
    expect(preservesWords("it was conntrack", "It was actually conntrack.")).toBe(false);
  });

  it("normalizes whitespace and case only", () => {
    expect(wordSignature("  It WAS  not,  DNS. ")).toBe("it was not dns");
  });
});
