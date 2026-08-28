import { describe, expect, it } from "vitest";
import { RawExtraction, wordCount } from "../src/stages/extract.js";

const insight = {
  claim: "A small cache removed repeated database reads.",
  context: "The service handled the same lookup on every request.",
  evidence: "This deliberately long evidence is exempt from generated prose limits because it must remain a verbatim transcript span no matter how informal it is.",
  slide_relation: "off_slides",
  stance: "asserted",
  speaker: "instructor",
  tags: ["caching"],
};

const valid = {
  lead_insight: insight,
  insights: [],
  build_ideas: [{
    title: "Measure repeated database reads",
    pitch: "Build a request tracer that counts duplicate reads. Use the count to find safe caching targets.",
    effort: "afternoon",
    you_will_learn: "How to measure repeated work before adding a cache.",
    stack_hint: ["Postgres"],
    origin: { evidence: insight.evidence },
  }],
  agent_prompts: [],
  callbacks: [],
  glossary: [{ term: "cache", definition: "Stored data reused to avoid repeated work.", timestamp: 1 }],
  announcements: [],
  open_questions: [],
};

describe("generated prose limits", () => {
  it("counts hyphenated technical terms as one word", () => {
    expect(wordCount("A byte-to-string path removed one allocation." )).toBe(6);
  });

  it("accepts concise prose and unrestricted evidence", () => {
    expect(RawExtraction.safeParse(valid).success).toBe(true);
  });

  it("rejects long claims, pitches, and prerequisite lists", () => {
    const words = Array.from({ length: 31 }, (_, i) => `word${i}`).join(" ");
    expect(RawExtraction.safeParse({ ...valid, lead_insight: { ...insight, claim: words } }).success).toBe(false);
    expect(RawExtraction.safeParse({
      ...valid,
      build_ideas: [{ ...valid.build_ideas[0], pitch: Array.from({ length: 41 }, () => "word").join(" ") }],
    }).success).toBe(false);
    expect(RawExtraction.safeParse({
      ...valid,
      agent_prompts: [{
        title: "Check database queries",
        what_it_does: "Finds repeated reads and reports their call sites.",
        prompt: "Inspect the repository for database reads. Group identical queries by call site. Report repeated reads with file paths and counts. Do not edit files. Validate each finding against the code. Return a short table with query, caller, repetition risk, and one safe caching option. Note any query whose result depends on user permissions or transaction state.",
        prerequisites: ["repo", "database", "logs", "schema", "fifth item"],
        origin: { evidence: insight.evidence },
      }],
    }).success).toBe(false);
  });

  it("rejects generated agent prompts shorter than the useful minimum", () => {
    const prompt = {
      title: "Check database queries",
      what_it_does: "Finds repeated reads and reports their call sites.",
      prompt: "Run the check and report the result.",
      prerequisites: ["repo"],
      origin: { evidence: insight.evidence },
    };
    expect(RawExtraction.safeParse({ ...valid, agent_prompts: [prompt] }).success).toBe(false);
  });
});
