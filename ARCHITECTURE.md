# Lecture Brief — Architecture & Decision Record

**Audience:** the implementing agent, and future-me
**Scope:** one course (USC CSCI 599, Fall 2026, ~150 students), one semester, one operator

> **Status: original plan, not the as-built system.** This file preserves the product thesis, trust constraints, grounding contract, data contract, and the decisions that motivated the first implementation. Several implementation decisions changed during the demo build. `BUILD_PLAN.md` supersedes this file wherever they conflict and contains the current stack, delivered state, deviation ledger, operator workflow, and remaining work. Do not infer current behavior from the original stack, pipeline diagram, build order, or v2 list below without checking `BUILD_PLAN.md` first.

---

## 0. How to use this document

This is the original decision record, not a tutorial. Every section marked **DECISION** was settled for that plan. The implemented demo later made explicit, documented substitutions in `BUILD_PLAN.md §1`; those substitutions now take precedence. Decisions not superseded there still hold.

Sections marked **OPEN** are yours to figure out.

The most common way this project fails is an implementer who builds a competent generic transcription-and-summary app. That product exists a dozen times over and is worth nothing. Read §1 before writing any code.

---

## 1. Product thesis

Lectures in this course are not recorded. The professor's best material — real incidents at named companies, opinions about which frameworks are dying, asides about what actually happened at a conference — is not on the slides. You hear it once and it's gone.

There are no exams. Nobody is memorizing this. The 150 people in the room are there because the material is directly applicable to what they are building and where they want to work.

**So the product is two things, in this order:**

1. **The delta** — what was said that isn't on the slides.
2. **The application** — side projects worth building for fun, and prompts to start them, based on what was said this week.

Part 2 is what makes this worth opening for someone who already attended. A record of the lecture is useful once; a weekly "here are three things to go build this weekend and the prompts to start" is useful every week and is the thing people forward to friends in other programs.

Part 2 is explicitly extracurricular. It is not homework help, not assignment scaffolding, and not connected to the graded work in any way. See §6.1 — this is a product definition, not a disclaimer bolted on afterwards.

Three consequences that drive every design choice:

- **The off-slide classification and the applied sections are first-class features, not nice-to-haves.** Both ship in v1.
- **The output is shared, not personal.** One artifact serves 150 people. That is what makes it worth more than everyone running Otter privately.
- **Trust is the constraint.** A confidently wrong claim about what the professor said, or a prompt that doesn't run, is worse than no claim at all. See §5 and §6.

---

## 2. Hard constraints

| Constraint | Architectural consequence |
|---|---|
| Professor reviews before publication | Content has a publication state. The build excludes unapproved content, enforced in code. |
| Recording is a phone at the front of the room | Transcription provider chosen by bake-off, not by default. See AD-0. |
| No personal attribution in v1 | Insights are attributed to "the lecture" or "the instructor," never by name. See AD-10. |
| Unlisted at first, public once it works | Nothing structural, but the bar for tone and accuracy rises at the flip. See §10. |
| Off-the-record material must never be published | Redaction happens before extraction. See §7.2. |
| Build ideas are side projects only, never coursework | Coursework exclusion at the reduce stage, plus a standing on-page label. See §6.1. |
| Claims must be checkable | Every published insight carries a verbatim transcript span and a timestamp. |
| Prompts must actually run | Every published prompt is executed once by the operator before publication. |
| Zero budget | Target under $2 per lecture, all-in. |

---

## 3. Scope boundary for v1

> **Historical scope.** Accounts, comments, Postgres, and Next.js were subsequently pulled into the demo MVP. The current boundary is in `BUILD_PLAN.md §§0–1, 7`.

**Build:** a command-line pipeline that turns one audio file plus one slide deck into one reviewable JSON document, and a static site that renders those documents.

**Do not build, even if it seems easy:**

- User accounts, login, or any auth
- A web upload interface
- A database of any kind
- Audio hosting or an audio player
- Search
- Multi-course support, or any abstraction anticipating it
- A job queue, worker, or background service
- Flashcards, quizzes, or spaced repetition
- Email digests or notifications
- Comments or student-generated content (planned for v2 — see §14)
- A mobile app or PWA

Every one of these is a plausible v2. Building any of them in v1 costs a day and buys nothing, because what determines whether this project is good is the quality of the extraction and the applied sections.

**The operator is the only user of the pipeline.** It runs on their laptop, by hand, once a week. Design for that, not for a service. The *site* serves 150 people; the pipeline serves one.

---

## 4. Architecture decisions

### AD-0: The recording is a phone at the front of the room

**DECISION.** A phone, placed at the front of the lecture hall, recording a ~110-minute evening class. There is no budget for a lav or a dedicated recorder. The speaker has a mild Italian accent. This is the input, and everything downstream is built around it rather than around ideal audio.

**Why this is stated as a decision:** it is the binding constraint on output quality and it is not a software problem. No prompt engineering recovers information the microphone did not capture. The implementer should treat transcript quality as fixed input, not as something to improve later.

**Capture requirements:**

- Record at the highest quality the phone offers, uncompressed if available. Voice-memo defaults are often heavily compressed and noise-gated, and gating clips the start of quiet sentences.
- Phone flat on a hard surface, screen up, not in a bag or pocket, not on fabric.
- Airplane mode. A call or notification mid-lecture costs you the lecture.
- Same placement every week. Consistency lets you tune once rather than per-recording.

**Provider bake-off is a Day 1 task, not a preference.** Accented speech plus room reverb plus dense jargon is exactly where transcription providers diverge most, and the ranking is not predictable from marketing pages. Record ten minutes in the actual room, run the same file through two or three providers, and count errors on course terms and on complete sentences. Pick on measured results. Budget an hour for this; it is the highest-return hour in the build.

**If the bake-off shows all providers performing badly, that is a finding, not a failure.** Report it before building the rest, because the product's viability depends on it.

### AD-1: Hosted transcription with vocabulary boosting

**DECISION.** Use a hosted speech-to-text API. The provider is chosen by the AD-0 bake-off, not picked in advance. Whichever wins, pass the course glossary in as keyword or keyterm boosting if it is supported.

**Rejected:** local `whisper.cpp`. It's free and private, but a 2-hour lecture takes 10–20 minutes per run and there is no privacy requirement here.

**Why boosting matters more than model quality:** the difference between providers on clean general English is small. The difference on *accented speech carrying this course's vocabulary* — OpenClaw, NemoClaw, NanoClaw, LangGraph, A2A, MCP, Gemma, Nemotron, PinchBench, AGENTS.md, Ollama — is large. Accent and jargon compound badly: a common word said with an unfamiliar vowel is usually recovered from surrounding context, but a rare technical term said with an unfamiliar vowel has no context to recover from. Boosting is the one lever that addresses this, and it acts at transcription time, which beats fixing terms downstream because a mis-transcribed term also corrupts the surrounding sentence.

**Cache the transcript** keyed by a hash of the audio file. Re-running the pipeline must never re-transcribe. This matters enormously for §8, where the operator iterates on prompts dozens of times.

### AD-2: Use provider-native diarization

**DECISION.** Enable speaker diarization if the provider offers it. Do not build a separate diarization stage.

**Why it earns its place now:** at 150 students the Q&A is substantial and the questions are often better than the lecture. Distinguishing "the professor asserted this" from "a student speculated this" is an accuracy requirement, not a nicety — see the `stance` and `speaker` fields in §9. Provider-side diarization is a flag; `pyannote` is a fragile dependency chain and a lost day.

If the chosen provider doesn't offer it, ship with `speaker: "unclear"` as the default and let the extraction model infer. Never default to `instructor`.

**Temper the expectation.** A phone at the front of the room captures the instructor well and a question from row twelve badly or not at all. Diarization can only label what was recorded. Do not build a dedicated Q&A section on the assumption that student questions will be usable — check what actually comes through in the first real lecture, and treat any usable Q&A as a bonus rather than a planned feature.

### AD-3: Term correction is a separate, non-destructive pass

**DECISION.** After transcription, run a correction pass over the transcript using a glossary extracted from the syllabus. Store the corrected transcript alongside the raw one. Log every correction as `{from, to, timestamp}`.

**Why, given AD-1 already boosts:** boosting reduces errors, it does not eliminate them, and a reader who was in the room and sees "Nemo Claw" three times stops trusting the page. This is a cheap belt-and-braces pass.

**Why non-destructive:** a correction pass can introduce errors, and a silent rewrite of what the professor said is the failure mode this project can least afford. Keeping both versions makes a bad correction diagnosable rather than invisible.

**Constrain it hard.** The model receives the glossary and a transcript chunk and may output *only* term substitutions. It must not rephrase, fix grammar, remove filler, or restructure sentences. A model told to "clean up" a transcript will smooth away exactly the informal asides that are the product.

### AD-4: Map-reduce extraction, not single-pass

**DECISION.** Split the corrected transcript into ~12-minute windows with ~1 minute of overlap. One structured extraction call per window. Then one reduce call over all window outputs together.

**Why not single-pass:** a 2-hour transcript is 25–30k tokens. It fits in context, but recall degrades badly across a document that long — the model over-samples the beginning and end and thins out in the middle, which is often where lectures peak.

**Why reduce is not optional:** it deduplicates insights appearing in window overlaps, ranks across the whole lecture rather than within a window, picks the lead insight, spots callbacks to earlier weeks, and generates the applied sections (§6), which require whole-lecture context. Window outputs are small enough that all fit in one reduce call.

**Deduplication is semantic, done in the reduce prompt.** Two windows phrase the same point differently. Fuzzy string matching misses most real duplicates and merges some non-duplicates.

### AD-5: The slide comparison is three-way, not binary

**DECISION.** Each insight is labelled `on_slides`, `elaborates_slide`, or `off_slides`.

**Why this is the subtle one:** the obvious implementation is a boolean, and the boolean destroys the product. The professor puts "prompt injection" on a slide as a bullet, then spends six minutes on a real incident at a real company. A binary flag files that under "on slides" because the topic matches, and the best moment of the lecture disappears into the collapsed section.

`elaborates_slide` means the slide names the topic and the spoken content adds something the slide does not contain — a story, a number, an opinion, a caveat, a correction. **This category holds most of the value.** Render it with the off-slide material, not with the recap.

Extract slide text (`pdfplumber` or equivalent) and pass it to the reduce call. The comparison is semantic — do not string-match.

### AD-6: Git is the database

**DECISION.** Each lecture produces one JSON file committed to the site repository. The site reads those files at build time. No runtime data store.

**Why:** a semester is fifteen files of ~40KB. A database adds hosting, migrations, a connection layer, and an environment-variable surface and buys nothing at this size. Git gives version history free, which matters because the professor's review edits should be traceable.

Publishing is `git push`. A static site serves 150 readers on a free tier without thinking about it.

### AD-7: Publication state lives in the data

**DECISION.** Every lecture document has `status: "draft" | "approved"`. Every insight, build idea, and prompt has `redacted: boolean`. The build **excludes** any lecture not `approved` and any item marked `redacted`, and both exclusions are covered by tests.

**Why:** the professor was promised review before publication and the ability to cut individual items. If that promise lives only in the operator's discipline it will eventually be broken by a tired person deploying at 1am. Make the failure impossible rather than unlikely.

**Default is `draft`.** A newly generated lecture is never publishable without an explicit human edit.

### AD-8: No audio in v1; the transcript excerpt is the evidence

**DECISION.** Do not host audio. Each insight renders with its verbatim transcript excerpt visible on the page.

**Why:** this is a scope decision, not a privacy one. Hosting audio adds storage, bandwidth, and an access-control question. The purpose audio would serve — letting a reader verify a claim — is served nearly as well by showing the actual words inline, for free.

This is first on the v2 list (§14) and the schema already carries the timestamps it needs.

### AD-9: A CLI, not a service

**DECISION.** One entry point: `brief process <audio> --slides <pdf> --week <n>`. Plus `brief extract <week>` which re-runs extraction from the cached transcript.

**Why the second command exists:** the operator will iterate on the extraction prompt dozens of times during the build. The loop must be seconds, not minutes. If re-running extraction requires re-transcribing, prompt quality will be undertuned and the product will be mediocre. Small detail, outsized effect.

### AD-10: Generic attribution, not personal attribution

**DECISION.** Published content attributes claims to "the lecture" or "the instructor." The professor is not named anywhere on the site — not in insight text, not in page copy, not in metadata or page titles.

**Why:** the operator wants to go public once the product works, and a public page carrying named opinions about named companies, attributed to a specific person, from a transcript that person never proofread, is a larger commitment than it looks. Generic attribution keeps the content intact while lowering the stakes of a transcription error.

**Be honest about what this does and doesn't do.** Anyone who knows the course knows who teaches it, so this is not anonymization and should not be described as such. It is a tone and framing choice that keeps the professor's name out of search results and off quotable cards. Treat it as courtesy, not as a privacy control, and don't let it become an excuse for looser accuracy standards.

**Enforcement:** the extraction prompt is instructed never to use the instructor's name, and a check on the built output greps for it. Add the name to a small blocklist file rather than hardcoding it, so this survives the expansion to other courses.

**Third parties are separate.** Companies, products, and public figures the instructor discusses may be named, because that is the substance of the stories. What protects those references is the `stance` field and the grounding contract, not de-identification — a story attributed to a real company must be exactly as specific as the transcript was, and no more. This is the §5 sharpening problem in its highest-risk form.

---

## 5. The grounding contract

The most important section in this document. 150 people will act on what this site says.

**Every published insight must satisfy all of:**

1. It has a `timestamp` (seconds into the lecture).
2. It has an `evidence` field containing a **verbatim** span from the corrected transcript, 1–3 sentences.
3. The `claim` is supported by that evidence and adds no specificity the evidence does not contain.
4. It passed the verification pass below.

**Point 3 is the one that will be violated.** The dangerous hallucination here is not invention from nothing — it's plausible sharpening. The transcript says "some big retailer had this happen"; the model writes "Walmart had this happen." The transcript says "a lot of these agents fail"; the model writes "roughly 40% fail." Named entities, numbers, dates, and percentages absent from the evidence span are the highest-risk output this system produces. The extraction prompt must forbid introducing them and the verifier must specifically check for them.

**Verification pass.** After reduce, for each insight, a separate cheap model call receives only the `claim` and the `evidence` and answers whether the evidence supports the claim without added specifics. `supported` keeps it, `partially_supported` keeps it with a visible hedge, `unsupported` drops it. The verifier must not see the rest of the lecture — isolating it is what makes it a real check rather than a rubber stamp.

**Attribution and epistemic status.** Each insight carries `stance: "asserted" | "speculated" | "attributed" | "opinion"`. "MCP was released in November 2024" and "I think MCP absorbs A2A within a year" are different kinds of statement, and notes that flatten them into identical bullets mislead. Render the distinction visually.

---

## 6. The applied sections

This is the half of the product that distinguishes it from a notes site, and the half most likely to degrade into generic slop. A model asked for "project ideas about AI agents" produces the same five ideas every time, and they read exactly like what they are.

**The governing rule for both sections: if it could have been written by someone who didn't attend the lecture, cut it.**

### 6.1 Build ideas

Two to four per lecture. Zero is a valid output for a lecture that was purely conceptual — do not set a minimum.

Each build idea carries:

- `title` — what the thing is
- `pitch` — two sentences on what it does and why it's interesting
- `origin` — the specific moment in the lecture that motivated it, with `evidence` and `timestamp`
- `effort` — `afternoon` | `weekend` | `multi_week`
- `you_will_learn` — the specific capability, named concretely
- `stack_hint` — the actual tools discussed that week, not generic ones

**Constraints that matter:**

**Traceability.** Every idea must name the lecture moment it came from. This is the whole difference between a good section and a slop section. An idea whose `origin` is vague ("the lecture discussed agents") is a signal the model invented it and it should be dropped.

**Specificity.** Name the actual protocol, framework, or failure mode discussed that week. "Build an agent that uses tools" is worthless. "Build an MCP server that exposes your university's course catalog, then point Claude Code at it" is a thing someone does on Saturday.

**Effort honesty.** Overpromising is how you lose readers permanently. If it's a multi-week build, say so. A reader who starts an "afternoon" project that takes three days does not come back.

**These are side projects, and only side projects.** This is a definitional constraint, not a warning label. The section exists because the material in this course is directly applicable to things people want to build for themselves — a tool they'd actually use, something for a portfolio, something that's just fun to make on a Saturday. It does not exist to help anyone with the graded work, and content that drifts toward the graded work makes the section worse on its own terms as well as riskier.

The test for a good build idea: **would someone do this for no credit, on a weekend, because they want the thing to exist?** Personal utility, curiosity, and portfolio value are the goals. Bias toward small, weird, and personally useful over impressive-sounding.

**Coursework exclusion.** The pipeline is given the four assignment descriptions from the syllabus as an exclusion list. Any idea that substantially overlaps an assignment's requirements is dropped at the reduce stage. The operator also checks this by hand before approval — one of only two places (with §6.2) where human review is not optional. When in doubt, cut the idea; there is no shortage of things to build.

**Standing label.** The build section on every lecture page and the top of `/build` carry a persistent, visible line: *Side projects for extended learning. Not for coursework or assignments.* It is part of the section chrome, always rendered, never conditional on a flag. A reader who lands on a deep link to a single build idea must still see it.

The same applies to the prompts in §6.2.

### 6.2 Agent prompts

One to three per lecture. These are copy-pasteable prompts a reader drops into Claude Code, Codex, or a chat window to apply that week's technique to their own work.

Each prompt carries:

- `title`
- `what_it_does` — one sentence
- `prompt` — the full text, self-contained
- `prerequisites` — what must exist first (a repo, an API key, an installed tool)
- `origin` — the lecture moment, with `evidence` and `timestamp`
- `tested` — boolean, see below

**Constraints that matter:**

**Self-contained.** The prompt must not reference the lecture, the site, or prior context. Someone pastes it into a fresh session and it works. A prompt containing "as we discussed in class" is broken.

**Tested is a gate, not a field.** `tested: false` items do not publish. The operator runs each prompt once, in a real session, before approving the lecture. A prompt that fails on paste is worse than no prompt — it costs the reader ten minutes and costs the site its credibility permanently. This is the second place human review is not optional.

**Not a homework machine.** Same exclusion and same standing label as §6.1. A prompt that scaffolds an assignment deliverable does not ship, regardless of how good it is.

**Concrete over clever.** The good prompts are narrow and do one thing: scaffold an MCP server with two tools, add a LangGraph interrupt-based approval step to an existing graph, write an adversarial prompt-injection test suite against a tool-calling agent. The bad ones are open-ended and produce nothing.

---

## 7. Pipeline

### 7.1 Stages

> **Historical pipeline.** The delivered demo removed chunk/map/reduce for 38-minute sources, added punctuation, assembly, publication, local-file ingestion, and a complete `brief process` orchestrator. See `BUILD_PLAN.md §§0, 3, 5`. Map-reduce remains the intended correction when real inputs return to approximately two hours.

```
audio ──▶ transcribe ──▶ correct terms ──▶ redact ──▶ chunk
                                                        │
slides ────────────────────────────────────────┐        ▼
assignments (exclusion list) ──────────────────┼──▶ extract (map)
                                               │        │
                                               │        ▼
                                               └────▶ reduce
                                                        │
                                                        ▼
                                                     verify
                                                        │
                                                        ▼
                                              lecture-NN.json (draft)
```

Each stage writes to `.cache/<audio-hash>/<stage>.json` and is skipped if that file exists, unless `--force`. This is what makes iteration cheap.

### 7.2 Redaction happens before extraction

**DECISION.** A per-lecture `redactions.yml` lists timestamp ranges and literal strings to exclude. These are stripped from the transcript **before** extraction sees it.

**Why the ordering matters:** if the professor says "this next part is off the record," the safe design is that the extraction model never sees it. Extracting first and filtering afterwards means off-record content exists in a JSON file, in a cache, and possibly in git history, and one careless commit publishes it to 150 people.

### 7.3 Cost and latency budget

Per lecture, roughly: hosted transcription for a 2-hour file; correction ~2× transcript tokens; extraction map ~10 calls; one large reduce call; verification ~30 small calls. Under $2 all-in with a mid-tier model. Wall clock under ten minutes.

**If a stage exceeds ten times its expected cost, fail loudly rather than continuing.** A prompt bug that loops is the realistic way this gets expensive.

---

## 8. The extraction prompt is the product

**OPEN — this is where the operator's time goes, not the implementer's.**

Build the prompts as versioned files (`prompts/extract.md`, `prompts/reduce.md`, `prompts/verify.md`), not strings embedded in Python, so they can be edited and diffed without touching code. Log which prompt version produced each document.

### What counts as an insight

A single claim, story, opinion, correction, or pointer that can be stated in one sentence, would still be useful to someone a week later who was in the room, and is grounded in a specific transcript span.

### What is not an insight

- Restatements of slide bullets with no addition
- Course administration — deadlines, room changes, assignment logistics. These go in a separate `announcements` array.
- The model's own commentary, framing, or synthesis
- Generic background about a technology the professor did not actually discuss
- Anything that reads like it was written to fill a quota

**Under-extraction is the correct failure mode.** Six sharp insights beat twenty padded ones, and a page of filler destroys the reason anyone opens the site. Instruct for scarcity explicitly and set no minimum count.

### The lead insight

Reduce selects exactly one `lead_insight` — the single thing most worth knowing from this lecture. This forces editorial judgment and gives every page a spine. It must be a claim, not a topic label. "We covered MCP" is a failure; "stateless MCP means the 2025 transport assumptions in most tutorials are now wrong" is what this field is for.

---

## 9. Data contract

The JSON document is the interface between pipeline and site. Fix it early; both sides depend on it.

```jsonc
{
  "schema_version": 1,
  "course": "CSCI 599",
  "week": 4,
  "date": "2026-09-22",
  "title": "",                    // human-written, not model-generated
  "status": "draft",              // draft | approved
  "prompt_version": "extract@0.3",
  "generated_at": "",

  "lead_insight": { /* insight object */ },

  "insights": [{
    "id": "",                     // stable slug — see below
    "claim": "",
    "context": "",
    "evidence": "",               // VERBATIM transcript span
    "timestamp": 0,
    "slide_relation": "off_slides",   // on_slides | elaborates_slide | off_slides
    "stance": "asserted",             // asserted | speculated | attributed | opinion
    "speaker": "instructor",          // instructor | student | unclear
    "verification": "supported",      // supported | partially_supported
    "tags": [],
    "redacted": false
  }],

  "build_ideas": [{
    "id": "",
    "title": "",
    "pitch": "",
    "effort": "weekend",              // afternoon | weekend | multi_week
    "you_will_learn": "",
    "stack_hint": [],
    "origin": { "evidence": "", "timestamp": 0 },
    "redacted": false
  }],

  "agent_prompts": [{
    "id": "",
    "title": "",
    "what_it_does": "",
    "prompt": "",
    "prerequisites": [],
    "origin": { "evidence": "", "timestamp": 0 },
    "tested": false,                  // publication gate — see §6.2
    "redacted": false
  }],

  "callbacks":      [{ "to_week": 2, "note": "", "timestamp": 0 }],
  "glossary":       [{ "term": "", "definition": "", "timestamp": 0 }],
  "announcements":  [{ "text": "", "timestamp": 0 }],
  "open_questions": [],

  "corrections_log": [{ "from": "", "to": "", "timestamp": 0 }]
}
```

### Slug stability

**DECISION.** An item's `id` is generated once, from its content, then **persisted and never regenerated.** On re-runs, match items to existing ids by evidence-span overlap; mint new ids only for genuinely new items.

**Why:** these ids are URL anchors and the sharing model depends on a link to a specific insight or prompt continuing to work. If ids are derived fresh on every run, every re-extraction silently breaks every link anyone shared, and the failure is invisible to the operator.

---

## 10. Site

Astro, static output, content read from the JSON files. Deployed to Vercel or Cloudflare Pages. Tailwind is fine.

**Name and domain are TBD.** Pick something that survives expansion beyond this one course, so not `csci599notes`. The repo, the deploy target, and the visual identity all wait on this, so settle it before Day 5.

**Publication staging.** v1 ships unlisted — deployed, linked to classmates, `noindex` in the meta tags and in `robots.txt`. It goes public once the operator is satisfied with output quality. Removing `noindex` is the entire technical change; the real change is that the accuracy and tone bar rises, because a public page is read by people who were not in the room and cannot sanity-check anything. Re-read a full lecture page against that standard before flipping it.

### Routes

- `/` — latest lecture, full
- `/w/[week]` — one lecture
- `/w/[week]#[id]` — deep link to one insight, build idea, or prompt
- `/archive` — all lectures with dek lines
- `/t/[tag]` — insights across the semester by tag
- `/build` — every side project idea from every week, filterable by effort
- `/prompts` — every prompt from every week

The last two routes exist because the applied content has a longer shelf life than the lecture recaps. Someone looking for a weekend project in November should not have to remember which week it came from. These are the pages people will link to from outside the class, which is also why both carry the side-projects-only label in their header rather than buried at the bottom.

### Information architecture of a lecture page

Order matters and encodes the product thesis:

1. Week, date, title
2. **The lead insight**, given more visual weight than anything else on the page
3. **Off the slides** — `off_slides` and `elaborates_slide` insights, each a self-contained card with claim, context, evidence excerpt, timestamp, and stance marker
4. **Build this** — the build ideas, with effort labels visible before the reader commits attention, under the standing side-projects-only label
5. **Prompts to try** — each with a copy button and its prerequisites stated above the prompt, not below, under the same label
6. Callbacks to earlier weeks
7. Glossary
8. Announcements
9. **On the slides** — `on_slides` insights, collapsed by default

Sections 3–5 before 9, with 9 collapsed, is the design. Do not "improve" it by merging everything chronologically.

### Sharing

Every insight, build idea, and prompt has a copy-link action. Prompts additionally have a copy-text action that copies the prompt body alone, cleanly, with no surrounding markup. That copy button is the single most-used control on the site — make it work on mobile.

### What not to do

Do not clone the visual design of aidailybrief.ai. Take the structural pattern — atomic linkable items, one lead idea, dek-lined archive — and build a distinct visual identity. The operator is showing this to people as their own work.

---

## 11. Acceptance criteria

Done when all of these hold on one real lecture:

- [ ] `brief process` runs end to end on a 2-hour recording without manual intervention
- [ ] `brief extract` re-runs extraction from cache in under 60 seconds
- [ ] Every published insight has a non-empty verbatim `evidence` span that appears in the corrected transcript (test this, exact substring match)
- [ ] No insight contains a proper noun, number, or date absent from its evidence span (spot-check 20 by hand — this is the check that finds real problems)
- [ ] Every published build idea and prompt has a non-empty `origin.evidence`
- [ ] No published build idea or prompt overlaps a course assignment (hand-checked)
- [ ] The side-projects-only label renders on the build and prompt sections of a lecture page, on `/build`, on `/prompts`, and when landing on a deep link to a single item
- [ ] Every published prompt has `tested: true`, and every one of them was actually pasted into a fresh session and ran
- [ ] A `draft` lecture does not appear in the built site (test)
- [ ] A `redacted` item does not appear in the built site (test)
- [ ] Re-running extraction preserves existing ids for unchanged items
- [ ] Every course-specific term is spelled correctly across the whole page
- [ ] The instructor's name appears nowhere in the built output (grep check)
- [ ] The deployed site carries `noindex` until the operator explicitly flips it
- [ ] The operator, who attended, finds at least three things they had forgotten and one they missed entirely
- [ ] The operator would actually spend a weekend building one of the ideas, for no credit

The last two are the only criteria that measure whether the product works. The rest are necessary conditions for them.

---

## 12. Known failure modes

| Failure | Signal | Response |
|---|---|---|
| Poor room audio | Transcript is mush; nothing downstream fixes it | Highest-risk item in the project and not a software problem. See AD-0: consistent placement, airplane mode, high-quality capture, and a real provider bake-off before anything else is built. |
| Accented terms silently wrong | A term is transcribed as a different real word, so nothing looks broken | Vocabulary boosting, the correction pass, and a human who was in the room reading the page |
| Q&A not captured | Student questions absent or garbled | Expected with a front-of-room phone. Don't promise a Q&A section. |
| Instructor named in output | His name appears on a public page | Prompt instruction plus a grep check on the built site (AD-10) |
| Generic build ideas | Ideas that could have been written without attending | Enforce `origin`; drop anything with vague provenance |
| Prompts that don't run | A reader wastes ten minutes and doesn't return | `tested` gate, no exceptions |
| Build idea drifts toward coursework | It reads like assignment scaffolding rather than something you'd build for fun | Exclusion list, hand check before approval, and the weekend test in §6.1 |
| Model pads to fill sections | Insights restating slides; four build ideas every single week | Tighten toward scarcity; remove implied counts; allow zero |
| Plausible sharpening | Names and numbers that feel too specific | Verification pass plus manual spot-checks |
| Correction pass rewrites meaning | Someone who was there says "he didn't say that" | Diff `corrections_log`; raw transcript retained for this |
| Overlap duplicates | Same point twice on the page | Semantic dedup in reduce |
| Broken shared links | Anchors 404 after a re-run | Slug persistence (§9) |
| Scope creep | Day 4 spent on auth | §3 |

---

## 13. Build order

> **Historical build order.** The implementation is complete through the demo/deployment milestone. The checked state and actual deviations are recorded in `BUILD_PLAN.md`; do not use this section as the current checklist.

- **Day 1** — Record ten minutes in SGM 124 with the phone in its real position. Run that sample through two or three transcription providers, count errors on course terms, pick a winner. Then get transcription working end to end with vocabulary boosting and caching. Nothing else.
- **Day 2** — Glossary extraction from the syllabus; correction pass; `corrections_log`; redaction.
- **Day 3** — Chunking, map extraction, reduce. Raw JSON to stdout. No site yet.
- **Day 4** — Slide ingestion, three-way comparison, assignment exclusion list, verification pass. Schema frozen.
- **Day 5** — Astro site, all routes, deployed. Ugly is acceptable today.
- **Day 6** — Prompt iteration only. No code. Re-run `brief extract` twenty times, read every output, and personally run every generated agent prompt.
- **Day 7** — Visual polish, then hand it to five classmates and watch what they open first.

Day 6 is not slack and must not be traded for features. The extraction and applied-section prompts are what determine whether this is good.

Watch what the five classmates open first. If it's the build ideas rather than the recap, that tells you where the product actually is.

---

## 14. Deferred to v2

### Reader comments — the intended direction

> **Implemented earlier than planned.** Authenticated, item-anchored comments now exist in the Postgres runtime. The checked-in Vercel deployment deliberately runs in read-only file mode, so comments are not enabled there yet. See `BUILD_PLAN.md §0`.

The strongest planned expansion, and the reason to keep it out of v1 anyway. Letting readers reply to an insight, add their own project ideas, and share prompts they've tuned turns a publication into something with a reason to return. With 150 people in the course, the ceiling on reader-contributed prompts is plausibly higher than on generated ones.

What it costs, stated plainly so it isn't discovered mid-build:

- **It breaks the static architecture.** Comments need identity, storage, and moderation, which is the whole reason AD-6 and AD-7 are as simple as they are.
- **It changes the review promise.** The professor was told he reviews content before publication. That promise covers what the operator publishes; it does not cover what a reader posts under an insight on the same page. Once comments exist, moderation stops being optional and becomes an obligation the operator has taken on. Decide what the policy is before shipping it, not after the first bad comment.
- **Anonymous comments on a page about a named course are a bad idea.** Require identity.

**Cheapest path that preserves the architecture:** Giscus, which backs comments with GitHub Discussions. No database, no auth code, no hosting, free, and GitHub login is a negligible barrier for graduate CS students. It also gives moderation tools for free and keeps everything in the same repo. Try this before building anything custom.

**Natural extension:** promote the best reader-contributed build ideas and prompts into the main sections with attribution. That's the mechanism that makes the applied sections improve over the semester instead of plateauing at whatever the model produces.

### Editor's voice

Adding the operator's own one-line take under an insight — a hedge, a disagreement, a pointer to something related. This is what gives a publication a personality rather than a tone. Needs an `editor_note` field and raises the per-lecture review burden. Worth trying once the pipeline is boring.

### Everything else

Audio hosting with timestamp deep-links (first in line — the schema already carries the timestamps). Semantic search across the semester. Auto-generated share images. Multi-course support. A professor-facing review UI replacing hand-edited JSON. RSS or email digest. Cross-lecture concept graph. A "did you build it" feedback loop on build ideas.

None of these are worth anything until the extraction and the applied sections are good.
