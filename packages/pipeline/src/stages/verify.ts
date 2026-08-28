/**
 * Stage: verify.
 *
 * ARCHITECTURE.md §5's grounding contract, the last gate before anything is
 * publishable. Each insight is checked in an isolated call that sees only
 * `claim` and `evidence` — nothing else about the talk. Isolation is what
 * makes this a real check rather than a rubber stamp: a call that also saw
 * the surrounding transcript would rationalize a claim it should reject
 * cold. `verify.md`'s own prompt is what enforces the specific failure mode
 * (§5): plausible sharpening — a name, number, date, or percentage in the
 * claim that isn't in the evidence.
 *
 * This is not a fresh `cached()` stage: there is no `verify.json`. It reads
 * the existing `extract` cache, rewrites `verification` on each surviving
 * insight (dropping any the model calls `unsupported` — the `Insight`
 * schema only ever has room for `supported` | `partially_supported`,
 * because an unsupported claim is never publishable), and writes the result
 * back under the same `extract` stage key. `verified` on `ExtractResult`
 * marks that this rewrite has happened, so a plain re-run is a no-op until
 * `--force` or a fresh (unverified) extract clears the flag.
 *
 * `partially_supported` items are kept, not hedged in text here — ARCHITECTURE.md
 * §5 says to "render the distinction visually," which is a Day 5/site
 * concern once there's a page to render it on. This stage's job is to get
 * the field right, not to rewrite `claim`.
 *
 * Only insights are checked. `BuildIdea` and `AgentPrompt` have no
 * `verification` field in the frozen schema — their traceability is `origin.evidence`
 * plus the operator's hand review (ARCHITECTURE.md §6.1, §6.2), not this pass.
 */

import { z } from "zod";
import { callJson } from "../llm.js";
import { loadPrompt, fill } from "../prompts.js";
import { readCache, writeCache } from "../cache.js";
import { EFFORT } from "../config.js";
import type { Insight } from "@lecturebrief/schema";
import { ExtractResult } from "./extract.js";

const VerifyResult = z.object({
  verification: z.enum(["supported", "partially_supported", "unsupported"]),
});
type Verdict = z.infer<typeof VerifyResult>["verification"];

async function verifyInsight(prompt: { system: string; template: string }, insight: Insight): Promise<Verdict> {
  const { data } = await callJson(VerifyResult, {
    system: prompt.system,
    user: fill(prompt.template, { claim: insight.claim, evidence: insight.evidence }),
    effort: EFFORT.verify,
  });
  return data.verification;
}

export async function run(
  videoId: string,
  opts: { force?: boolean } = {},
): Promise<{ data: ExtractResult; fromCache: boolean }> {
  const existing = await readCache(videoId, "extract", ExtractResult);
  if (existing.verified && !(opts.force ?? false)) {
    return { data: existing, fromCache: true };
  }

  const prompt = await loadPrompt("verify");
  let dropped = 0;

  const leadVerdict = await verifyInsight(prompt, existing.leadInsight);

  const restVerdicts: Array<{ insight: Insight; verdict: Verdict }> = [];
  for (const insight of existing.insights) {
    restVerdicts.push({ insight, verdict: await verifyInsight(prompt, insight) });
  }

  const survivingRest: Insight[] = [];
  for (const { insight, verdict } of restVerdicts) {
    if (verdict === "unsupported") {
      dropped++;
      continue;
    }
    survivingRest.push({ ...insight, verification: verdict });
  }

  let leadInsight: Insight;
  let insights: Insight[];
  if (leadVerdict !== "unsupported") {
    leadInsight = { ...existing.leadInsight, verification: leadVerdict };
    insights = survivingRest;
  } else {
    dropped++;
    const promoted = survivingRest.shift();
    if (!promoted) {
      throw new Error(
        `verify: every insight for ${videoId} failed grounding verification — nothing survives to publish. Re-run extract or inspect the transcript.`,
      );
    }
    leadInsight = promoted;
    insights = survivingRest;
  }

  const data: ExtractResult = {
    ...existing,
    leadInsight,
    insights,
    verified: true,
    droppedForUnsupported: dropped,
  };
  await writeCache(videoId, "extract", data);
  return { data, fromCache: false };
}
