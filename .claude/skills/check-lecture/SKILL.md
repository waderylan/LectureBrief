---
name: check-lecture
description: Audit one lecture JSON against the acceptance criteria before flipping it to approved. Trigger on "check lecture 2", "is this ready to publish", "audit the output", "approve week 3".
---

# Check lecture

Run before setting `status: "approved"` on a lecture in `/content`. Report findings; do not edit the file.

## Automated

- `pnpm test` green.
- Every `evidence` span is an exact substring of the corrected transcript.
- Every build idea and prompt has non-empty `origin.evidence` and a timestamp.
- No blocklisted name anywhere in the document.
- Every `agent_prompts` entry is either `tested: true` or will be dropped at publish.
- Ids match the previous run for items whose evidence is unchanged.

## By hand — these are the ones that find real problems

**Sample 20 insights and read the claim against its evidence span.** Flag any claim carrying a proper noun, number, date, or percentage the evidence doesn't contain. This is plausible sharpening and it's the highest-risk output in the system. An automated check catches the obvious cases; a person catches the ones that read naturally.

**Read every build idea against the assignment exclusion list.** Overlap with graded work does not ship. When in doubt, cut — there's no shortage of things to build.

**Run every prompt.** Fresh session, paste, confirm it does what `what_it_does` says. Not "looks right" — actually run it. A prompt that fails on paste costs a reader ten minutes and costs the site its credibility permanently.

**Check the lead insight is a claim, not a topic label.**

**Spot-check `slide_relation`.** Anything filed `on_slides` that actually elaborates the slide is buried in a collapsed section, which is exactly the failure the three-way split exists to prevent.

## The two that decide it

- Would you spend a weekend building one of these ideas, for no credit?
- Does someone who watched the talk find three things they'd forgotten and one they missed?

Everything above is a necessary condition for these two. If the automated checks pass and these don't, the lecture isn't ready and the fix is in `/prompts`, not in the JSON.

## Output

A short report: what passed, what failed with specifics, and a recommendation to approve or send back to `prompt-tune`. Hand-editing the JSON to fix a bad claim hides a prompt problem that will recur next week.
