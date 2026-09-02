# Build Plan — MVP

**Target:** a working, deployed artifact to show in instructor conversations (BUSINESS_MODEL §11), carrying enough of the differentiated feature set that it demonstrates the product rather than the pipeline.
**Original horizon:** one focused week (realistically 8 working days — see §6). The implementation milestone is complete; §0 is the current status.
**Demo source material:** public conference talks + open courseware. Local Voice Memos ingestion is implemented for future consenting lectures; no non-consenting instructor or student capture is authorized.

This supersedes ARCHITECTURE.md where they conflict. Deltas are listed in §1; everything not listed there still holds. `ARCHITECTURE.md` remains authoritative for the product thesis, AD-3, AD-5, AD-8 through AD-10, the §5 grounding contract, §6 applied sections, §8 extraction principles, and §12 failure modes.

---

## 0. Current implementation — 2026-09-01

**Status:** the demo MVP is implemented and deployed. The product has not completed user or instructor validation and is not ready for a real course pilot.

| Area | Delivered state |
|---|---|
| Pipeline | `brief process <source> --slides <pdf-or-url> --week <n>` runs ingest → transcribe → correct → redact → punctuate → slide extraction → single-pass extraction → isolated verification → assembly. It always stops at `content/lecture-NN.draft.json`; approval and publication remain manual. |
| Sources | YouTube URLs/video IDs use timed auto-captions. Local Voice Memos and common media files use a SHA-256 source ID and default to local `whisper.cpp`; Deepgram remains an explicit fallback. Slide decks may be local PDFs or remote URLs. |
| Local STT | `whisper.cpp` 1.9.3 with `large-v3-turbo`, fixed English, CUDA, and a bounded glossary prompt was installed and smoke-tested on the development machine. The runtime and 1.51 GB model are machine-local prerequisites under `%LOCALAPPDATA%/whisper.cpp`, not committed repository assets. |
| Content | Three public conference talks have approved canonical documents in `content/lecture-01.json` through `lecture-03.json`. Draft artifacts and stage caches stay out of Git. |
| Grounding | Verbatim evidence, real timestamps, three-way slide relation, isolated claim verification, coursework exclusion, redaction gates, tested-prompt gates, generic attribution, and stable item IDs are implemented. |
| Site | Next.js App Router renders `/`, `/w/[week]`, `/archive`, `/build`, `/prompts`, `/signin`, and `/signup`. The planned `/t/[tag]` route was cut. |
| Interactive runtime | Postgres, Drizzle, Auth.js credentials, and item-anchored comments are implemented and work in the database-backed runtime. |
| Checked-in deployment | Vercel is configured for `LECTUREBRIEF_CONTENT_SOURCE=files`: it renders approved canonical JSON read-only, retains `noindex`, and disables auth/comments. This is intentionally not the full interactive runtime. |
| Verification | TypeScript typecheck, 54 non-database tests, a production web build, real local Whisper transcription, cached transcription, and end-to-end URL processing were verified. Publish integration tests require a reachable configured Postgres database. |

**What remains before this can be called a validated product:**

- Pick the final name and domain.
- Put the artifact in front of five readers and measure what they open and retain.
- Run the ten instructor conversations in `BUSINESS_MODEL.md §11`.
- Validate that a generated idea is genuinely worth a weekend and that a viewer recovers three forgotten points plus one missed point.
- Restore chunked map-reduce before treating approximately two-hour lectures as production-safe. Local STT accepts long recordings, but a full two-hour local run has not been benchmarked; the current single-pass extractor was chosen for the 38-minute demo talks.
- Configure hosted Postgres and remove file-content mode only if the deployed demo needs auth/comments.
- Add moderation, an instructor approval workflow, and FERPA-grade handling before any pilot with real students.
- Revisit source rights before removing `noindex`; `SOURCES.md` records access, not broad republication licenses.

---

## 1. What changes from ARCHITECTURE.md

| Decision | Status | Replacement |
|---|---|---|
| AD-0 phone capture | **Changed for demo; capability restored** | The demo uses public talks. Local Voice Memos files are now supported for a future consenting lecture, but no real-course capture or room/provider bake-off has been completed. |
| AD-1 hosted STT | **Replaced by selectable STT** | YouTube uses captions. Local files default to local `whisper.cpp` `large-v3-turbo`; `STT_PROVIDER=deepgram` is the hosted fallback. All paths normalize into the same transcript schema. |
| AD-2 provider diarization | **Partial** | Deepgram speaker numbers are retained without guessing semantic roles. Local Whisper has no reliable diarization, so `speaker` remains `unclear`. |
| AD-4 map-reduce | **Dropped for demo inputs** | A single extract call replaced chunk/map/reduce because the demo talks are approximately 38 minutes. Reinstate windows and reduce before relying on two-hour lecture recall. |
| AD-6 git is the database | **Amended** | Lecture JSON stays canonical in git; `brief publish` upserts it into Postgres. Comments and users live only in Postgres. |
| AD-7 publication state | **Strengthened** | Still enforced in code, now at the publish boundary rather than at static build. `draft` and `redacted` never reach Postgres at all. |
| §9 slug stability | **Strengthened** | Now a data-integrity requirement, not just link hygiene: comments FK to item ids, so a regenerated id orphans a thread. Gets its own test. |
| §10 Astro static | **Replaced** | Next.js (App Router). Auth and comments need a server. |
| §3 "do not build accounts / comments" | **Reversed** | Both are in scope. Everything else in §3 stays out — no payments, no search, no multi-course, no job queue, no mobile app, no email digests, no flashcards. |
| §10 `/t/[tag]` | **Cut** | The other planned routes are implemented. Tag browsing was the documented first scope cut and remains absent. |
| §10 name/domain before Day 5 | **Not completed** | `LectureBrief` remains a placeholder. Visual identity and deployment proceeded without a final domain. |
| §7.3 under $2/lecture | **Revisit later** | That budget assumed a mid-tier model. See §5. Irrelevant at demo scale; flagged, not solved. |
| CSCI 599 framing | **Dropped** | Nothing in the product names a course, an instructor, or an institution. |
| §5 model: Opus 5 via API | **Replaced** | Headless Codex (`codex exec`) on GPT-5.6 Luna, behind a one-file provider seam. Claude is an explicit compatibility option. |
| Static deployment vs interactive runtime | **Split deliberately** | The checked-in Vercel target reads approved files and disables auth/comments. Database-backed auth/comments currently remain a local/runtime capability until hosted Postgres is configured. |

Everything else — the grounding contract, the three-way slide comparison, the redact-before-extract ordering, the verification pass, the tested-prompt gate, the coursework exclusion, generic attribution — carries over unchanged. Those are what make it not a generic summarizer.

---

## 2. Stack

**One language, TypeScript, end to end.** No Python service. `unpdf` handles slide-deck text extraction; the only Python in the build is `yt-dlp` invoked as a CLI binary, which is not a dependency you maintain.

| Layer | Choice | Note |
|---|---|---|
| Pipeline | TypeScript CLI, `tsx`, `commander` | Runs on your laptop. One user: you. |
| Source ingest | `yt-dlp` captions or local media | YouTube inputs cache timed captions. Local files remain in place and receive a stable content-hash ID. |
| Transcription | YouTube captions, local `whisper.cpp`, or Deepgram | URLs use free timed captions. Local Voice Memos default to `large-v3-turbo` with English fixed and glossary prompting; Deepgram remains an optional hosted fallback. Every path enters the identical transcript schema. |
| Slide text | `unpdf` | Text PDFs. Falls back to a vision pass only if a specific deck is image-only. |
| LLM | Headless Codex (`codex exec`), GPT-5.6 Luna | Reuses Codex CLI authentication. `LLM_PROVIDER=claude` remains an explicit compatibility mode. Effort per stage (§5). |
| Schema/validation | `zod` | One schema file shared by pipeline and site. This is the §9 data contract, in code. |
| Site | Next.js App Router + Tailwind | Server components for reads, server actions for comments. |
| DB | Postgres + Drizzle | Implemented against a configured Postgres runtime. A hosted Neon/database deployment is not currently configured. |
| Auth | Auth.js v5, Credentials provider, bcrypt | Own auth, email + password, JWT session cookie. No OAuth app registration, no payment, no email service. ~2 hours. |
| Deploy | Vercel | `noindex` until you say otherwise. |

**Repo layout**

```
/packages/schema     zod schemas + TS types — the data contract, imported by both sides
/packages/pipeline   source ingest, STT providers, correction, redaction, punctuation, extraction, verification, assembly, publication
/packages/db         Drizzle schema, migrations, and Postgres client
/prompts             correct.md, punctuate.md, extract.md, verify.md — versioned, diffable
/content             lecture-NN.json, committed. canonical source of truth.
/apps/web            Next.js site
/.cache              source-hash-keyed stages, raw provider output, span cache, and week registry; gitignored
/redactions          per-source timestamp and literal-string exclusions
```

### 2.1 Operator workflow

Process a local Voice Memo and local slide deck:

```powershell
pnpm brief process "C:\Lectures\week-04.m4a" `
  --slides "C:\Lectures\week-04.pdf" `
  --week 4 `
  --title "Week 4 Lecture" `
  --date 2026-09-01
```

The same command accepts a YouTube URL/video ID and a remote slide URL. Local recordings use `STT_PROVIDER=whisper` by default. Set `STT_PROVIDER=deepgram` and `DEEPGRAM_API_KEY` to use the hosted fallback. `--force` invalidates relevant caches and may repeat paid Deepgram work.

The command writes `content/lecture-04.draft.json`. It does **not** approve or publish. The operator must:

1. Review grounding, redactions, corrections, build ideas, and prompt provenance.
2. Run every generated prompt and set `tested: true` only after it succeeds.
3. Promote the reviewed draft to `content/lecture-04.json` and set `status: "approved"` manually.
4. For the read-only Vercel deployment, commit and deploy the canonical file. For the database runtime, run `pnpm brief publish 4` after approval.

Useful verification commands:

```powershell
pnpm typecheck
pnpm exec vitest run --exclude packages/pipeline/test/publish.test.ts
pnpm --filter @lecturebrief/web build
```

Run `pnpm test` when the configured Postgres test database is reachable; `publish.test.ts` is intentionally an integration test.

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
- [x] Local Voice Memos ingestion (`.m4a`, plus common audio/video containers): content-hash identity, ffprobe metadata, cached local `whisper.cpp` or Deepgram output, and a timestamped transcript without guessing instructor/student roles.
- [x] Read the raw transcript for the DNS talk and judge jargon quality against the `syllabus.md` glossary. If terms are mangled beyond what the correction pass can fix, record that and reconsider paid STT.

*Gate: one full talk transcribed and cached with timestamps; provider speaker labels retained when available and semantic roles left unclear rather than guessed.*

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

**As-built extract contract:** extraction receives the punctuated transcript, slide text, and coursework exclusion list in one call. It assigns the three-way `slide_relation` and produces provisional `supported` verification values. The separate isolated verifier replaces those provisional values or drops the insight before assembly. Nothing generated here is published; assembly still produces `status: "draft"`.

**Note on timestamps:** the model is never asked to report a `timestamp` for anything anchored to `evidence` — the plain-text transcript it receives carries no timing markers, so a model-reported number would be a guess. The code instead locates the (verbatim-checked) evidence in the segment stream and reads the real segment start time off it. This also makes the verbatim check load-bearing: an evidence span that isn't found gets no timestamp and the item is dropped (`droppedForMissingEvidence`).

*Gate: JSON for one talk that you'd actually read.*

### Day 4 — Grounding, slides, verification

- [x] Slide deck ingestion via `unpdf`; text passed to the merged extract call.
- [x] Three-way `slide_relation` (AD-5): `on_slides` | `elaborates_slide` | `off_slides`. **Not a boolean** — `elaborates_slide` holds most of the value, and a binary flag files it under "recap" and destroys the product.
- [x] Coursework exclusion applied in the merged extract call, against the Day 0 assignment list.
- [x] Verification pass (§5): isolated cheap call per insight, seeing **only** claim and evidence. Specifically checks for proper nouns, numbers, dates, and percentages absent from the evidence span — plausible sharpening is the dangerous failure, not invention from nothing. `unsupported` drops; `partially_supported` keeps with a visible hedge.
- [x] Tests: every `evidence` is an exact substring of the corrected transcript; every published build idea and prompt has non-empty `origin.evidence`; blocklist grep for any name that shouldn't appear.

**As-built verification boundary:** verification remains separate because isolation — seeing only `claim` and `evidence` — is what makes it a real check. `brief verify <week>` reads the `extract` cache, drops `unsupported` insights, promotes a surviving lead if necessary, sets `supported` or `partially_supported`, marks the result `verified: true`, and writes it back to the same cache entry. There is intentionally no separate `verify.json`.

*Gate: schema frozen, grounding tests green.*

### Day 5 — Site, auth, comments (the big day)

- [x] Postgres + Drizzle. Tables: `users`, `lectures`, `items` (insights, build ideas, and prompts, keyed by the persisted slug), `comments`. The implemented database runtime is configurable; hosted Neon is not currently wired into the checked-in deployment.
- [x] `brief publish <n>`: validates, **refuses anything not `approved`, drops every `redacted` item and every prompt with `tested: false`**, then upserts into Postgres. Three tests, one per exclusion. This is the promise the whole business rests on — make the failure impossible, not unlikely.
- [x] Auth.js v5, credentials, bcrypt, JWT session. Sign up, sign in, sign out. No password reset, no email verification, no roles beyond `user` and `admin`.
- [x] Routes: `/`, `/w/[week]`, `/w/[week]#[id]`, `/archive`, `/build`, `/prompts`. The planned `/t/[tag]` route was cut.
- [x] Lecture page IA exactly as ARCHITECTURE.md §10 orders it: lead insight, then off the slides, then build this, then prompts, then callbacks, glossary, announcements, and **on the slides collapsed at the bottom**. Do not merge it chronologically.
- [x] Comments anchored to a specific item id, not to a weekly thread. Signed-in users only. Server action, optimistic render.
- [x] Copy-link on every item; copy-text on every prompt body, clean, **working on mobile**. This is the most-used control on the site.
- [x] Standing label on the build and prompt sections, on `/build`, on `/prompts`, and on a deep link to a single item: *Side projects for extended learning. Not for coursework or assignments.* Always rendered, never conditional on a flag.
- [x] `noindex` in meta and `robots.txt`.
- [x] Deploy. Ugly is fine today.

*Gate: the database-backed runtime supports sign-up and item comments; the checked-in Vercel deployment is intentionally read-only.*

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
- [x] In the database-backed runtime, a signed-in user can comment on a specific insight; a signed-out user cannot
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

**Map-reduce is dropped only for the 38-minute demo talks.** AD-4 windows the transcript because a 2-hour lecture is 25–30k tokens and recall sags in the middle. A 38-minute talk is ~7,600 tokens — windowing it yields three chunks, which is pure overhead and actively worse, since whole-talk context is exactly what the reduce stage needed windowing to recover. Local ingestion can now accept two-hour Voice Memos files, but that does not make the single-pass extractor production-safe at that length. Reinstate windowing and reduce before the first real two-hour lecture.

**Headless calls are isolated generation functions.** Codex runs with `--ephemeral`, `--ignore-user-config`, `--ignore-rules`, and a read-only sandbox from the system temp directory. This keeps repository instructions, user settings, tools, and rollout files out of extraction context. The model receives only the versioned function contract and the delimited input on stdin; stdout contains only the final JSON response.

**YouTube transcription is free** through auto-captions. Local Voice Memos recordings default to `whisper.cpp` with `large-v3-turbo`, `language=en`, CUDA when the installed build supports it, and a bounded glossary prompt. FFmpeg converts the source to temporary 16 kHz mono PCM; the temporary WAV is removed after inference. Set `STT_PROVIDER=deepgram` for the hosted Nova fallback with glossary keyterms and diarization. Provider output and the normalized transcript use provider-specific cache keys under the content-hash source ID, so changing providers never serves stale output and downstream retries never transcribe again. Speaker roles remain `unclear` instead of guessing that speaker 0 is the instructor.

**Guardrail:** if any stage exceeds ten times its expected token count, fail loudly. A looping prompt bug is the realistic way this gets expensive — in subscription usage rather than dollars, but expensive either way.

---

## 6. Scope retrospective

Accounts and comments added roughly a day and a half that `ARCHITECTURE.md`'s seven-day plan did not budget for, landing almost entirely on Day 5, which was already the site day. The original estimate should have been eight to nine focused working days.

**The documented seven-day cut order was:**

1. `/t/[tag]` route
2. `/archive` dek lines (plain list instead)
3. The third source talk (two is enough to demo; three is better evidence that it isn't cherry-picked)
4. Visual polish on Day 7

**Do not cut Day 6.** Trading prompt iteration for features is how this ends up as a competent generic transcription-and-summary app, which exists a dozen times over and is worth nothing.

---

## 7. Explicitly out of scope for the MVP

Payments. Password reset and email verification. Promotion of student contributions into the main sections (BUSINESS_MODEL §3 Layer 3 — the mechanic that makes the corpus compound, and a v2 feature). Instructor-facing approval UI (you hand-edit JSON; a real instructor gets one in the pilot build, not this one). Instructor analytics. Moderation tooling. FERPA-grade data handling — **required before the first real pilot with real students, not before a demo with synthetic content on public talks.** Multi-course support. Audio hosting. Search. Institutional SSO. LMS integration.

Every one of these is a real requirement for the company. None of them make the demo more convincing, and the demo's only job is to make instructor conversation number four go differently than number one did.
