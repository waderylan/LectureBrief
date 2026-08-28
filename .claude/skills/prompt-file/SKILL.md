---
name: prompt-file
description: Author or revise a versioned prompt in /prompts — correct.md, extract.md, reduce.md, or verify.md. Trigger on "write the extraction prompt", "revise the reduce prompt", "update the verifier".
---

# Prompt file

Prompts are markdown files in `/prompts`, read at runtime, versioned and diffable. Never TypeScript strings.

Bump the version header on every substantive change and make sure the emitted `prompt_version` on the lecture JSON reflects it, so any output can be traced to the prompt that produced it.

## The four prompts

**`correct.md`** — receives the glossary and one transcript chunk. May output **only term substitutions**. Must explicitly forbid rephrasing, grammar fixes, filler removal, and sentence restructuring. A model told to "clean up" a transcript smooths away the informal asides that are the entire product.

**`extract.md`** (map, per window) — pulls insights from one window. An insight is a single claim, story, opinion, correction, or pointer, statable in one sentence, still useful to someone a week later, grounded in a specific span. Not insights: restatements of slide bullets, course administration (those go to `announcements`), the model's own synthesis, generic background the speaker didn't actually discuss.

**`reduce.md`** — sees all window outputs plus slides, glossary, and the assignment exclusion list. Deduplicates semantically, ranks across the whole talk, picks exactly one `lead_insight`, assigns `slide_relation`, and generates the build ideas and prompts.

**`verify.md`** — sees **only** a claim and its evidence span. Nothing else. Answers `supported` / `partially_supported` / `unsupported`. The isolation is what makes it a real check instead of a rubber stamp.

## Constraints that must appear in the prompt text

- **No added specificity.** The claim may not introduce a proper noun, number, date, or percentage absent from the evidence span. "Some big retailer" must not become a named company; "a lot of these fail" must not become a percentage. This is the highest-risk output the system produces and the verifier checks for it specifically.
- **Verbatim evidence.** The `evidence` field is copied exactly from the corrected transcript, 1–3 sentences. Not paraphrased.
- **Scarcity.** No minimum counts, no implied quotas. Six sharp insights beat twenty padded ones. Zero build ideas is a valid output for a talk that was purely conceptual.
- **`slide_relation` is three-way.** `elaborates_slide` means the slide names the topic and the speaker added something the slide doesn't contain — a story, a number, an opinion, a caveat. That category holds most of the value; a binary on/off-slides flag destroys the product.
- **`stance`** distinguishes `asserted` from `speculated` from `attributed` from `opinion`. A stated fact and a prediction are different kinds of claim and flattening them misleads.
- **Never name the speaker.** Attribute to "the lecture" or "the speaker". Third-party companies and public figures may be named, at exactly the specificity the transcript used and no more.
- **Build ideas need traceable origin.** Every one names the specific moment that motivated it, with evidence and timestamp. Vague provenance means the model invented it. Name the actual protocol or failure mode discussed, not a generic one. Be honest about `effort`.
- **Prompts must be self-contained.** No reference to the lecture, the site, or prior context. Someone pastes it into a fresh session and it works. A prompt containing "as we discussed" is broken.
- **Nothing that overlaps a course assignment.** The exclusion list is in the reduce context. When in doubt, cut it.

## Rule

Changing a prompt is not a code change and does not need a code change to take effect. If you find yourself editing TypeScript to change model behavior, stop — the behavior belongs in the prompt file.
