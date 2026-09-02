# Build Plan — MVP

**Target:** a working, deployed artifact to show in instructor conversations (BUSINESS_MODEL §11), carrying enough of the differentiated feature set that it demonstrates the product rather than the pipeline.
**Horizon:** one focused week (realistically 8 working days — see §6).
**Source material:** public conference talks + open courseware. No student capture, no non-consenting instructor.

This supersedes ARCHITECTURE.md where they conflict. Deltas are listed in §1; everything not listed there still holds, and ARCHITECTURE.md remains the authority on the pipeline internals (AD-1 through AD-5, AD-8 through AD-10, §5 grounding contract, §6 applied sections, §8 extraction prompt, §12 failure modes).

---

## 1. What changes from ARCHITECTURE.md

| Decision | Status | Replacement |
|---|---|---|
| AD-0 phone capture | **Dropped** | Audio from public talks (`yt-dlp`) and open courseware. The provider bake-off survives but shrinks — see §3 Day 1. |
| AD-6 git is the database | **Amended** | Lecture JSON stays canonical in git; `brief publish` upserts it into Postgres. Comments and users live only in Postgres. |
| AD-7 publication state | **Strengthened** | Still enforced in code, now at the publish boundary rather than at static build. `draft` and `redacted` never reach Postgres at all. |
| §9 slug stability | **Strengthened** | Now a data-integrity requirement, not just link hygiene: comments FK to item ids, so a regenerated id orphans a thread. Gets its own test. |
| §10 Astro static | **Replaced** | Next.js (App Router). Auth and comments need a server. |
| §3 "do not build accounts / comments" | **Reversed** | Both are in scope. Everything else in §3 stays out — no payments, no search, no multi-course, no job queue, no mobile app, no email digests, no flashcards. |
| §7.3 under $2/lecture | **Revisit later** | That budget assumed a mid-tier model. See §5. Irrelevant at demo scale; flagged, not solved. |
| CSCI 599 framing | **Dropped** | Nothing in the product names a course, an instructor, or an institution. |
| AD-1 hosted STT + AD-4 map-reduce | **Dropped for MVP** | Free YouTube auto-captions; single-pass extraction. Both are consequences of 38-minute talks replacing 2-hour lectures. See §5. |
| §5 model: Opus 5 via API | **Replaced** | Headless Codex (`codex exec`) on GPT-5.6 Luna, behind a one-file provider seam. Claude is an explicit compatibility option. |

Everything else — the grounding contract, the three-way slide comparison, the redact-before-extract ordering, the verification pass, the tested-prompt gate, the coursework exclusion, generic attribution — carries over unchanged. Those are what make it not a generic summarizer.

---

## 2. Stack

**One language, TypeScript, end to end.** No Python service. `unpdf` handles slide-deck text extraction; the only Python in the build is `yt-dlp` invoked as a CLI binary, which is not a dependency you maintain.

| Layer | Choice | Note |
|---|---|---|
| Pipeline | TypeScript CLI, `tsx`, `commander` | Runs on your laptop. One user: you. |
| Source ingest | `yt-dlp` captions or local media | YouTube inputs cache timed captions. Local files remain in place and receive a stable content-hash ID. |
| Transcription | YouTube auto-captions or Deepgram prerecorded STT | URLs use free, timestamped captions. Local Voice Memos files use Deepgram Nova with glossary keyterms and diarization, then enter the identical transcript schema. |
| Slide text | `unpdf` | Text PDFs. Falls back to a vision pass only if a specific deck is image-only. |
| LLM | Headless Codex (`codex exec`), GPT-5.6 Luna | Reuses Codex CLI authentication. `LLM_PROVIDER=claude` remains an explicit compatibility mode. Effort per stage (§5). |
| Schema/validation | `zod` | One schema file shared by pipeline and site. This is the §9 data contract, in code. |
| Site | Next.js App Router + Tailwind | Server components for reads, server actions for comments. |
| DB | Postgres (Neon) + Drizzle | Free tier. Drizzle because migrations are plain SQL you can read. |
| Auth | Auth.js v5, Credentials provider, bcrypt | Own auth, email + password, JWT session cookie. No OAuth app registration, no payment, no email service. ~2 hours. |
| Deploy | Vercel | `noindex` until you say otherwise. |

**Repo layout**

```
/packages/schema     zod schemas + TS types — the data contract, imported by both sides
/packages/pipeline   the CLI: transcribe, correct, redact, chunk, extract, reduce, verify, publish
/prompts             extract.md, reduce.md, verify.md, correct.md — versioned, diffable
/content             lecture-NN.json, committed. canonical source of truth.
/apps/web            Next.js site
/.cache              audio-hash-keyed stage cache, gitignored
```

---

## 3. Day-by-day

### Day 0 — Sourcing and naming (half day, do this first)

- [x] Pick **3 source talks**, each with (a) audio you can pull, (b) a **separately published slide deck**, (c) dense story-driven delivery. Speakerdeck, the speaker's own site, and conference repos are where decks live. Without a deck there is no AD-5, and AD-5 is most of the value.
- [x] Confirm each one's license and terms permit what you're doing. Write the answer down per talk — you will be asked this in an instructor conversation.
- [x] Write a synthetic `syllabus.md` for the "course" these talks belong to: a glossary seed and 3–4 "assignment" descriptions for the coursework-exclusion list. The exclusion mechanism has to be exercised even though the course isn't real.
- [ ] **Pick the name and domain.** ARCHITECTURE.md §10 says settle it before Day 5; with a site that has accounts, settle it now — it goes in the repo, the deploy target, and the auth flow. Nothing course-specific.

*Gate: three talks with decks in hand. Do not start Day 1 without them.*

### Day 1 — Transcription

- [x] Repo scaffold: pnpm workspace, the four packages above, `tsconfig`, `.env.example`.
- [x] LLM adapter (`llm.ts`) over headless Codex, defaulting to GPT-5.6 Luna, with zod validation and one retry. Verified live: clean JSON, verbatim evidence spans, and correct stance classification. Claude remains opt-in.
- [x] `brief fetch <source>` pulls YouTube auto-captions or ingests local media metadata, caching by stable source id.
- [x] `brief transcribe` normalizes captions into the transcript shape — timestamps preserved, `speaker: "unclear"`. Output cached. **Re-running must never re-fetch.**
- [x] Local Voice Memos ingestion (`.m4a`, plus common audio/video containers): content-hash identity, ffprobe metadata, cached Deepgram response, timestamped transcript, and provider speaker labels without guessing instructor/student roles.
- [x] Read the raw transcript for the DNS talk and judge jargon quality against the `syllabus.md` glossary. If terms are mangled beyond what the correction pass can fix, record that and reconsider paid STT.

*Gate: one full talk transcribed and cached, with timestamps and speaker labels.*

### Day 2 — Correction, redaction, chunking

- [x] Glossary extraction from `syllabus.md` into a term list. Mechanical parse, not a model call.
- [x] Correction pass (AD-3): **term substitutions only.** Non-destructive — raw and corrected both retained, every change logged as `{from, to, timestamp}`. The prompt must forbid rephrasing, grammar fixes, filler removal, and restructuring. A model told to "clean up" a transcript deletes exactly the asides that are the product.
- [x] **Confidence gate on corrections.** Only `high` confidence substitutions are applied; `low` ones are recorded in `skipped` and surfaced, never applied. Added after v0.1 of the prompt produced `Cilium → Istio` and `cluster DNS → CoreDNS` — a confident falsehood reads as correct and survives review, where a visible transcription error does not.
- [x] Punctuation pass: insert sentence punctuation only, guarded by a word-sequence invariant. This makes AD-3's non-destructive guarantee provable rather than merely instructed — 10 unit tests cover it, and end-to-end word preservation is asserted over the whole transcript.
- [x] **Invariant true by construction, not by check.** `mergePunctuation` aligns the model's output against the original word array (LCS) and transplants only punctuation and casing. Words the model changed, dropped, split, or invented are discarded in favour of the original, so no model behaviour can violate the invariant and no retry is needed.
- [x] **Cost rework.** Call count, not span size, drives the bill: an invocation carries ~22k tokens of harness overhead against ~450 tokens of span content, so content was ~2% of each call. Spans widened 1800 to 8000 chars (20 calls to 5 per talk) and retries removed entirely. ~440k to ~110k tokens of overhead per talk.
- [x] **Per-span cache** keyed on span content plus prompt version. A failed span is left uncached, so a plain rerun calls out only for that span instead of redoing the whole talk. The CLI recomputes automatically when a cached result contains errors rather than serving a transcript with a hole in it.
- [x] `redactions/<videoId>.yml`: timestamp ranges and literal strings, stripped **before** extraction sees anything (§7.2). Ordered `correct → redact → punctuate` so literal strings match before punctuation is inserted mid-span.

~~Chunking~~ — **dropped.** Windows only existed to serve map-reduce, which §5 removed for talk-length input.

*Gate: a corrected transcript and a diffable corrections log.*

### Day 3 — Extraction

- [x] Freeze `packages/schema` against ARCHITECTURE.md §9. Both sides import it. Add nothing speculative.
- [x] ~~Map stage: one structured call per window~~ / ~~Reduce stage: one call over all window outputs~~ — implemented as one merged `extract` stage per §5 (map+reduce collapsed for talk-length input; Day 2 already dropped chunking, so per-window calls don't apply). Slides and the exclusion list are Day 4's, not the stable prefix here — see the note below. Semantic dedup/ranking/`lead_insight` selection/callbacks all happen in the single call.
- [x] `brief extract <n>` re-runs from cache. **Under 60 seconds** — measured ~1.2-1.7s cached, vs. ~50-80s for a fresh call.
- [x] Slug minting and persistence: ids generated once from content (`insight-<slug>-<hash>` etc.), matched on re-run by evidence-span overlap against whatever is currently cached (read even under `--force`), never regenerated for a matched item. Verified: re-running week 1 with `--force` reused ids for insights whose evidence matched the prior run and minted fresh ids only for genuinely new build ideas.
- [x] Output raw JSON to stdout. No site yet. Read it. Ran on all three talks (weeks 1-3); lead insights are specific and grounded (e.g. week 3: "a two-line NATS change... increased server throughput by two million messages a second").

**Note on `slide_relation` and `verification`:** neither is requested from the model here — Day 4 owns slide ingestion and the verify pass. Every insight from Day 3's extract carries provisional placeholders (`off_slides`, `supported`) that Day 4 overwrites. Nothing produced here is published (`status` stays `draft`), so this isn't a grounding violation, just an ordering one the original per-window map/reduce text didn't anticipate.

**Note on timestamps:** the model is never asked to report a `timestamp` for anything anchored to `evidence` — the plain-text transcript it receives carries no timing markers, so a model-reported number would be a guess. The code instead locates the (verbatim-checked) evidence in the segment stream and reads the real segment start time off it. This also makes the verbatim check load-bearing: an evidence span that isn't found gets no timestamp and the item is dropped (`droppedForMissingEvidence`).

*Gate: JSON for one talk that you'd actually read.*

### Day 4 — Grounding, slides, verification

- [x] Slide deck ingestion via `unpdf`; text passed to reduce.
- [x] Three-way `slide_relation` (AD-5): `on_slides` | `elaborates_slide` | `off_slides`. **Not a boolean** — `elaborates_slide` holds most of the value, and a binary flag files it under "recap" and destroys the product.
- [x] Coursework exclusion applied at reduce, against the Day 0 assignment list.
- [x] Verification pass (§5): isolated cheap call per insight, seeing **only** claim and evidence. Specifically checks for proper nouns, numbers, dates, and percentages absent from the evidence span — plausible sharpening is the dangerous failure, not invention from nothing. `unsupported` drops; `partially_supported` keeps with a visible hedge.
- [x] Tests: every `evidence` is an exact substring of the corrected transcript; every published build idea and prompt has non-empty `origin.evidence`; blocklist grep for any name that shouldn't appear.

**Note on the "passed to reduce" wording and the verify stage's cache shape:** this section's wording (and the `pipeline-stage` skill) still describes slide text and the exclusion list as inputs to a "reduce" stage. Day 3 already merged map and reduce into one `extract` call (§5), so there's no separate reduce stage left to hand them to. Resolution: slide text and the exclusion list join the extract stage's existing single call as additional context — the model assigns `slide_relation` and does its own coursework-exclusion self-check in that same call (`extract.ts`, `prompts/extract.md@0.2`) — rather than inventing a new "reduce" or "slides" stage for them. Verification stayed genuinely separate, per ARCHITECTURE.md §5's point that isolation (seeing only claim+evidence) is what makes it a real check: it's its own file (`verify.ts`) and its own prompt (`verify.md`), run via `brief verify <week>`. It isn't a fresh `cached()` stage, though — there's no `verify.json`. It reads the `extract` cache, drops any insight the model calls `unsupported` (the `Insight` schema only has room for `supported` | `partially_supported`, so an unsupported claim structurally can't be published), promotes a surviving insight to `lead_insight` if the original lead itself failed, and writes the result back under the `extract` cache key with `verified: true` — matching `cli.ts`'s existing comment that `verify` "read[s] from the cached extract.json and overwrit[es] each insight's verification field before re-caching."

*Gate: schema frozen, grounding tests green.*

### Day 5 — Site, auth, comments (the big day)

- [x] Neon Postgres + Drizzle. Tables: `users`, `lectures`, `items` (insights, build ideas, and prompts, keyed by the persisted slug), `comments`.
- [x] `brief publish <n>`: validates, **refuses anything not `approved`, drops every `redacted` item and every prompt with `tested: false`**, then upserts into Postgres. Three tests, one per exclusion. This is the promise the whole business rests on — make the failure impossible, not unlikely.
- [x] Auth.js v5, credentials, bcrypt, JWT session. Sign up, sign in, sign out. No password reset, no email verification, no roles beyond `user` and `admin`.
- [x] Routes: `/`, `/w/[week]`, `/w/[week]#[id]`, `/archive`, `/build`, `/prompts`. (`/t/[tag]` is the first thing to cut if the week gets tight.)
- [x] Lecture page IA exactly as ARCHITECTURE.md §10 orders it: lead insight, then off the slides, then build this, then prompts, then callbacks, glossary, announcements, and **on the slides collapsed at the bottom**. Do not merge it chronologically.
- [x] Comments anchored to a specific item id, not to a weekly thread. Signed-in users only. Server action, optimistic render.
- [x] Copy-link on every item; copy-text on every prompt body, clean, **working on mobile**. This is the most-used control on the site.
- [x] Standing label on the build and prompt sections, on `/build`, on `/prompts`, and on a deep link to a single item: *Side projects for extended learning. Not for coursework or assignments.* Always rendered, never conditional on a flag.
- [x] `noindex` in meta and `robots.txt`.
- [x] Deploy. Ugly is fine today.

*Gate: deployed; you can sign up and comment on a real insight.*

### Day 6 — Prompts only. No code.

- [x] Run `brief extract` twenty-plus times across all three talks. Read every output.
- [x] Tune toward **scarcity**. Six sharp insights beat twenty padded ones. Remove implied counts; allow zero build ideas for a talk that doesn't warrant any.
- [x] Kill every build idea whose `origin` is vague. Vague provenance means the model invented it.
- [x] **Personally run every generated agent prompt** in a fresh session. `tested: false` does not publish, no exceptions. A prompt that fails on paste costs a reader ten minutes and costs the site its credibility permanently.
- [x] Spot-check 20 insights by hand for specificity the evidence doesn't support. This is the check that finds real problems.

*This day is not slack and must not be traded for features. The extraction and applied-section prompts are what determine whether any of this is worth showing to anyone.*

### Day 7 — Polish and first contact

- [x] Visual identity. Distinct — you're showing this as your own work.
- [x] Approve and publish all three talks.
- [ ] Show it to five people. **Watch what they open first.** If it's `/build` rather than the recap, that tells you where the product actually is.
- [ ] Then start the ten instructor conversations (BUSINESS_MODEL §11) — now over a working artifact instead of a description.

**Deployment note:** the checked-in Vercel configuration renders approved canonical documents in read-only mode. Interactive auth and comments continue to use Postgres locally; enable them on a persistent deployment after configuring a hosted `DATABASE_URL` and removing the file-content override.

---

## 4. Acceptance criteria

Pipeline and grounding:
- [x] `brief process` runs end to end on one talk without manual intervention; accepts a YouTube URL/id or local media and a local/remote slide deck
- [x] `brief extract` re-runs from cache in under 60 seconds
- [x] Every published `evidence` span is an exact substring of the corrected transcript (tested)
- [x] No insight contains a proper noun, number, or date absent from its evidence span (20 hand-checked)
- [x] Every published build idea and prompt has non-empty `origin.evidence`
- [x] No published build idea or prompt overlaps a synthetic assignment (hand-checked)
- [x] Every published prompt has `tested: true` and was actually pasted into a fresh session and ran
- [x] Re-running extraction preserves existing ids for unchanged items (tested)

Publication control:
- [x] A `draft` lecture cannot be published (tested)
- [x] A `redacted` item cannot be published (tested)
- [x] An untested prompt cannot be published (tested)
- [x] Re-publishing a lecture does not orphan existing comments (tested — this is the slug-stability test)
- [x] Deployed site carries `noindex`

Product:
- [x] The side-projects-only label renders on lecture pages, on `/build`, on `/prompts`, and on a deep link to one item
- [x] Copy-prompt works on mobile
- [x] A signed-in user can comment on a specific insight; a signed-out user cannot
- [ ] **You would actually spend a weekend building one of the generated ideas, for no credit**
- [ ] **Someone who watched the talk finds at least three things they'd forgotten and one they missed**

The last two are the only ones that measure whether the product works. The rest are necessary conditions for them.

---

## 5. Model and cost

**MVP runs on headless Codex**, not a direct API integration. `codex exec` reuses the operator's saved CLI authentication and defaults to `gpt-5.6-luna`, the cost-sensitive high-volume tier. `packages/pipeline/src/llm.ts` keeps the provider boundary explicit; set `LLM_PROVIDER=claude` only when compatibility testing requires it. Provider failures never trigger a silent fallback.

| Stage | Effort | Note |
|---|---|---|
| Correct terms | `low` | Mechanical substitution. Emits a `{from,to,timestamp}` list, never a rewritten transcript — see AD-3. |
| Extract | `medium` | **Single pass, not map-reduce.** See below. |
| Reduce | `medium` | Merged into the extract call for talk-length input. |
| Verify | `low` | ~30 isolated calls. Do not batch them to save money; isolation is what makes it a real check. |

**Map-reduce is dropped for talk-length source material.** AD-4 windows the transcript because a 2-hour lecture is 25–30k tokens and recall sags in the middle. A 38-minute talk is ~7,600 tokens — windowing it yields three chunks, which is pure overhead and actively worse, since whole-talk context is exactly what the reduce stage needed windowing to recover. Reinstate windowing if the source ever returns to 2-hour lectures.

**Headless calls are isolated generation functions.** Codex runs with `--ephemeral`, `--ignore-user-config`, `--ignore-rules`, and a read-only sandbox from the system temp directory. This keeps repository instructions, user settings, tools, and rollout files out of extraction context. The model receives only the versioned function contract and the delimited input on stdin; stdout contains only the final JSON response.

**YouTube transcription is free** through auto-captions. Local Voice Memos recordings use paid Deepgram prerecorded STT with Nova, glossary keyterms, utterance timestamps, and diarization. The raw provider response and normalized transcript are cached under a content-hash source ID, so downstream retries never pay to transcribe again. Provider speaker numbers are retained, but remain `speaker: "unclear"` until a role can be established instead of guessing that speaker 0 is the instructor.

**Guardrail:** if any stage exceeds ten times its expected token count, fail loudly. A looping prompt bug is the realistic way this gets expensive — in subscription usage rather than dollars, but expensive either way.

---

## 6. Honest scope note

Accounts and comments add roughly a day and a half that ARCHITECTURE.md's seven-day plan did not budget for, and they land almost entirely on Day 5, which was already the site day. Expect eight to nine working days at one focused week's intensity.

**If you hold hard to seven days, cut in this order** — and note that comments are not on the list, because they're what distinguishes this from a notes site:

1. `/t/[tag]` route
2. `/archive` dek lines (plain list instead)
3. The third source talk (two is enough to demo; three is better evidence that it isn't cherry-picked)
4. Visual polish on Day 7

**Do not cut Day 6.** Trading prompt iteration for features is how this ends up as a competent generic transcription-and-summary app, which exists a dozen times over and is worth nothing.

---

## 7. Explicitly out of scope for the MVP

Payments. Password reset and email verification. Promotion of student contributions into the main sections (BUSINESS_MODEL §3 Layer 3 — the mechanic that makes the corpus compound, and a v2 feature). Instructor-facing approval UI (you hand-edit JSON; a real instructor gets one in the pilot build, not this one). Instructor analytics. Moderation tooling. FERPA-grade data handling — **required before the first real pilot with real students, not before a demo with synthetic content on public talks.** Multi-course support. Audio hosting. Search. Institutional SSO. LMS integration.

Every one of these is a real requirement for the company. None of them make the demo more convincing, and the demo's only job is to make instructor conversation number four go differently than number one did.
