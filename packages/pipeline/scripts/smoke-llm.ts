import { z } from "zod";
import { callJson } from "../src/llm.js";

const SRC = "TRANSCRIPT: We spent four weeks on this. The logs said DNS. It was not DNS. It was conntrack table overflow. Honestly I think most teams give up at week two. We fixed it by deleting three lines.";

const Schema = z.object({
  insights: z.array(z.object({
    claim: z.string(),
    evidence: z.string(),
    stance: z.enum(["asserted", "opinion"]),
  })),
});

const r = await callJson(Schema, {
  system: 'You are a JSON extraction function. Output ONLY raw JSON matching {"insights":[{"claim":string,"evidence":string,"stance":"asserted"|"opinion"}]}. evidence must be verbatim from the input.',
  user: SRC,
  effort: "low",
});
console.log("insights :", r.data.insights.length);
console.log("stances  :", r.data.insights.map(i => i.stance).join(", "));
console.log("verbatim :", r.data.insights.every(i => SRC.includes(i.evidence)));
console.log("cost_usd :", r.costUsd);
console.log("ms       :", r.durationMs);
