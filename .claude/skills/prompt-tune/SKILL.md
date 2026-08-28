---
name: prompt-tune
description: Run one Day 6 iteration — re-run brief extract, read the output critically, and change only prompt files. Trigger on "tune the prompts", "iterate on extraction", "the output is generic", "run another extraction pass".
---

# Prompt tune

Day 6. **No code changes.** Only files in `/prompts` may be edited. If a change seems to require touching TypeScript, that is a finding to report, not a license to edit.

## Loop

1. `pnpm brief extract <n>` (under 60 seconds off cache; if it isn't, that's a Day 3 bug worth fixing before continuing).
2. Read the entire output. Not a sample — all of it.
3. Judge against the tests below.
4. Change one thing in one prompt file. Re-run. Compare.
5. Keep a running note of what changed and whether it helped.

## What to judge

**Insights**
- Would someone who watched the talk say "yes, that's the good part"?
- Does any claim carry a name, number, date, or percentage its evidence span doesn't contain? This is the failure that matters most.
- Is `evidence` genuinely verbatim?
- Is anything filed `on_slides` that's actually `elaborates_slide`? That misclassification buries the best material in a collapsed section.
- Is the `lead_insight` a claim, not a topic label? "We covered MCP" fails. "Stateless MCP means most 2025 tutorials are now wrong" is the point of the field.
- Is `stance` right? A prediction marked `asserted` is a real error.

**Build ideas**
- **The weekend test:** would someone build this for no credit, on a Saturday, because they want the thing to exist?
- Could it have been written by someone who didn't watch the talk? If yes, cut it.
- Does `origin` name a specific moment, or gesture vaguely at a topic? Vague means invented.
- Does `stack_hint` name the tools actually discussed, or generic ones?
- Is `effort` honest? A reader who starts an "afternoon" project that eats three days does not come back.

**Prompts**
- Self-contained? Paste into a fresh session with no context.
- Narrow and concrete, doing one thing — not open-ended.
- **Actually run it.** `tested: false` does not publish, no exceptions.

**Across the whole output**
- Padding to fill sections is the signal to tighten toward scarcity. Cutting the quota usually beats adding instructions.
- If every talk yields exactly the same section counts, the model is filling a shape rather than reading the material.

## Rule

Under-extraction is the correct failure mode. When you can't decide whether something earns its place, cut it.
