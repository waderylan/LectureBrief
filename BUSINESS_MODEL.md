# [Name TBD] — Business Model & Product Strategy

**Author:** Rylan
**Status:** pre-build, post-first-rejection
**One line:** the discussion board that has something worth discussing.

---

## 1. What happened, and why it's the most useful input we have

The original plan was student-side: record lectures, generate a shared notes site, give it to the class. A professor was asked for permission and said no. His reasoning, in his words, was that the only sanctioned recordings in his classes are the ones the university makes for its distance-learning students, and that transcriptions of his lectures on the public internet would be equivalent to slide-derived content on Quizlet, against which he routinely files DMCA takedowns.

That answer looks like a setback. It is actually the market research.

**What it establishes:**

1. **Lecture content is not the student's to redistribute.** It belongs to the instructor, the institution, or both. Any product built on students capturing and sharing it is building on an asset it does not own, and the owners will eventually enforce. Chegg and Course Hero spent years and considerable money learning this.
2. **The objection is about control, not about students having good notes.** He did not say "my students shouldn't have this." He said "I don't control what leaves this room." Those are completely different objections and only one of them is fatal.
3. **The reflex is fast and it's institutional.** A senior lecturer reached for "DMCA" in a two-paragraph reply to a student he'd never spoken to. This is a settled position, not an opinion he was forming on the spot.

**The conclusion:** the student-side sharing company is not viable. The instructor-side company is, and the thing that makes an instructor say yes is exactly the control he said was missing.

---

## 2. The problem we're actually solving

Not note-taking. Note-taking is solved a dozen times over and none of those products need us.

**Course discussion boards are dead, and everyone involved knows it.**

Every course has one — Piazza, Ed, Canvas, Brightspace. Usage follows a predictable shape: logistics questions ("is the deadline midnight or 11:59?"), a burst of activity in the 48 hours before each deadline, and near-silence otherwise. Instructors who assign participation credit get performative posts written to satisfy a rubric. Instructors who don't get nothing at all.

**The standard diagnosis is wrong.** The usual explanation is bad UX, and so the usual fix is better threading, reactions, a nicer mobile app. That's not it.

**Discussion boards fail because there is nothing on them worth discussing.** An empty text box under the words "share your thoughts on this week's readings" is not a prompt, it's a chore. The reason people post in good online communities is that something specific and interesting was put in front of them and they had a reaction to it. Course boards skip that step entirely and go straight to demanding output.

There is also a cold-start problem that compounds it. A board with three posts stays a board with three posts, because nobody wants to be the first person talking into an empty room in front of their classmates and their professor.

**The gap:** the most discussable material in any course — the stories, the strong opinions, the off-slide tangents, the "here's what actually happened at that company" — is generated live in the lecture hall twice a week and then evaporates. It never reaches the board. What reaches the board is the syllabus and the deadlines.

---

## 3. The product

**A weekly brief generated from the lecture, published under instructor control, that functions as the substrate for discussion and for personal projects.**

Three layers, in dependency order. Each one only works because the one below it exists.

### Layer 1 — The brief (the substrate)

Generated from the lecture recording the institution already owns. Per lecture:

- **The lead idea.** The single most worth-knowing claim from the session.
- **Off the slides.** The material that isn't in the deck — stories, opinions, corrections, war stories. This is the highest-value content in any lecture and it is currently unrecoverable after the fact.
- **Callbacks and glossary.** Connections to earlier weeks; terms as they were actually used.

Every claim carries a verbatim transcript excerpt and a timestamp. Nothing publishes that can't be traced to something actually said.

**This layer solves cold start.** On day one, before a single student posts, the page has content worth reading. The board is never empty.

### Layer 2 — Build ideas and prompts (the activation)

Per lecture, two to four side projects grounded in specific moments from the session, and one to three tested, copy-pasteable prompts that apply the week's technique to the reader's own work.

**These are explicitly extracurricular.** Not homework, not assignment scaffolding, not connected to graded work in any way. Coursework overlap is excluded at generation time and labeled persistently on the page. This is a product definition rather than a disclaimer — see §7.

**This layer is what turns readers into posters.** "Discuss the reading" produces nothing. "Here's a weekend project, here's the prompt to start it, post what you made" produces something, because it gives people a concrete thing to do and a concrete thing to show.

### Layer 3 — Discussion (the engagement)

Comments on any individual insight, build idea, or prompt. Students post what they built, prompts they tuned, disagreements with a claim, related things they found.

Two mechanics that matter more than the threading model:

- **Promotion.** The best student-contributed build ideas and prompts get promoted into the main sections with attribution. This is the mechanism that makes the course brief improve over a semester instead of plateauing at whatever a model generated. It also gives students a real reason to post well: their work ends up on the page the whole class reads.
- **Anchoring.** Discussion attaches to a specific claim, not to a weekly thread. "I think this is wrong, here's why" under a specific insight is a real conversation. The same comment in a generic week-four thread is noise.

---

## 4. Why the instructor says yes

This is the whole business. If instructors don't consent, there is no product, and the first one we asked said no.

**What we offer that addresses his actual objection:**

| His concern | Our answer |
|---|---|
| I don't control what leaves the room | Nothing publishes without your explicit approval. Per-item veto, not all-or-nothing. |
| Public internet, Quizlet, DMCA | You choose the audience: enrolled students only by default. Public is opt-in, per course, never a default. |
| Unsanctioned recording | We use the recording the institution already makes. No student records anything. |
| Misattribution and errors | Every claim shows the verbatim transcript excerpt it came from. You can see exactly what you're approving. |
| I said that off the record | Mark it; it's stripped before the content is ever generated, not filtered afterwards. |

**What we offer that he wasn't asking for but wants:**

Most syllabi allocate participation credit — the course that prompted this allocates 15% — and instructors have no honest way to measure it. They fall back on counting posts, which produces exactly the performative behavior they didn't want. We give them a view of who is actually engaging with the material, including a category that doesn't currently exist anywhere: **students who went and built something.**

That's a better signal than post count and it costs the instructor nothing to obtain.

**The pitch is one sentence:** your lecture already gets recorded, and the best things you say in it disappear. We'll turn each session into something your class actually discusses, and you approve every word before anyone sees it.

---

## 5. Who buys

Three paths. They are sequential, not alternatives.

### Entry: accessibility services

Universities are legally required to provide note-taking support to students with approved accommodations. Most do it by recruiting and paying peer note-takers — expensive, inconsistent in quality, and chronically hard to staff.

This is the rare edtech entry point where **the budget already exists, the mandate already exists, and there is a named office with a procurement path.** The compliance officer is on your side rather than in your way.

It is also a genuinely good fit: a structured, searchable, verifiable brief is better than a classmate's handwriting.

Land here. Expand to the full class from inside.

### Growth: instructor-by-instructor, free

Free for individual instructors. They opt in for their own course, publish to their own students, control everything. Grows course by course until the institution has to formalize it. This is how essentially every successful edtech tool has actually spread.

**Be clear-eyed: individual professors have no budget.** This is a distribution strategy, not a revenue strategy. Its purpose is to make the institutional sale inevitable.

### Revenue: the institution

Integrate with the lecture capture system already in place — Panopto, Echo360, Kaltura, Zoom. Be a layer on top of it, never a competitor to it; the capture vendor is a partner and possibly an acquirer.

Sell per-department or per-institution seats. Slow cycle, procurement, security review, accessibility review, FERPA. But no rights problem, real contract sizes, and near-zero churn once embedded in a semester's workflow.

### Adjacent, if academia proves too slow

The off-slide delta generalizes to any organization with recorded talks and slides: internal all-hands, sales enablement, corporate training, conference organizers. Same pipeline, same product, faster sales, actual budgets, and nobody files DMCA takedowns against a tool their own company purchased.

Less interesting, materially easier. Worth holding as a live option rather than a fallback.

---

## 6. Why this is defensible

The pipeline is not the moat. Transcription and summarization are commodities and will get cheaper every quarter.

**The moat is consent and the workflow it creates.**

- **Rights position.** We are the version of this that instructors permit. Every competitor built on student capture is one enforcement letter from a problem. That's not a feature we can be copied on; it's a structural choice that determines who will work with us.
- **Instructor review as habit.** Once an instructor has reviewed and approved twelve weeks of content, they have a workflow, a body of approved material, and a reason not to switch. Adoption is per-course and sticky within a semester.
- **The corpus compounds.** A course's briefs, promoted student projects, and prompt library accumulate across semesters. Year two of a course starts from year one's artifact. Nobody else has that.
- **Content substrate is hard to bolt on.** A competing discussion tool can add comments in a week. It cannot add a reason to comment.

---

## 7. Non-negotiable constraints

These come from what we've learned and from the nature of the content. Violating any one of them ends the company.

**Instructor approval before publication, enforced in code.** Not a setting, not a policy, not a promise. Content has a publication state and the system cannot publish unapproved material. This is the single commitment the entire business rests on.

**Every claim traceable.** Verbatim excerpt plus timestamp on everything. Instructors approve faster when they can see the source, and students trust content they can verify. The dangerous error class is not invention from nothing — it's plausible sharpening, where "some big retailer" becomes a named company and "a lot of these fail" becomes a percentage. Guard specifically against added specificity.

**Build ideas and prompts are never coursework.** The test is whether someone would build it for no credit on a weekend because they want the thing to exist. Overlap with graded assignments is excluded at generation time and checked by a human. This protects students, protects instructors, and keeps the section good on its own terms — an idea that drifts toward the assignment is also a worse idea.

**Student posts are education records.** FERPA applies. This shapes hosting, retention, export, and what any instructor-facing analytics can show. Handle it before the first pilot, not during the first procurement review.

**Instructor copyright survives an institutional contract.** At most US universities faculty retain copyright in their own lecture materials. A signed deal with a university does not clear the individual instructor's rights. Consent stays per-instructor no matter who pays. Building on the assumption that the institutional contract covers it would recreate exactly the problem we're avoiding.

---

## 8. Engagement without the trap

The stated goal is to increase engagement. That goal is easy to hit badly.

**Do not build a points system.** If participation is scored by post count, students optimize post count and the board fills with compliance. That is the current failure mode of every course board and the reason it fails; reproducing it with a nicer interface makes it worse, not better.

**Give instructors signal, not a score.** Show them who is engaging and how. Let them exercise judgment. Do not compute a participation grade — the moment we do, we own an incentive we cannot control and the content quality collapses.

**Measure projects, not posts.** The metric that matters is how many students built something they wouldn't otherwise have built. Post count is a vanity metric that actively misleads here.

**Optimize for the quiet majority.** In a class of 150, the goal is not thirty prolific posters. It is that a hundred students read the brief, and twenty of them build something. A board can look dead by comment count while the product is working perfectly.

**Promotion beats gamification.** Getting your project featured on the page the whole class reads is a stronger and healthier motivator than a badge, and it improves the artifact instead of inflating a counter.

---

## 9. Competition, honestly

**Yellowdig** is the closest analogue: engagement-focused course discussion, sold to institutions, with participation mechanics. They have solved the distribution and procurement problem we haven't. What they have not solved is the empty-room problem — they sell a container, and the container still needs someone to put something in it. Our claim is that the substrate is the hard part and the container is the easy part. That claim needs to survive contact with a real pilot.

**Piazza, Ed Discussion, Campuswire** own the incumbent position and are entrenched at the course level. We should assume we sit alongside them initially rather than replacing them.

**Otter, Granola, generic AI note-takers** are commoditized, student-side, and carry the rights problem we're specifically avoiding. Not competitors so much as the thing we're deliberately not.

**Panopto, Echo360, Kaltura** are partners, not competitors — until one of them ships this natively, which is the real strategic risk. Being a layer on top means being acquirable; it also means being replaceable. Move fast on the consent workflow and the accumulated corpus, because those are the parts they'd have to rebuild rather than announce.

---

## 10. What could kill this

| Risk | Why it's real | What reduces it |
|---|---|---|
| Instructors won't consent at scale | The first one asked said no, immediately and firmly | §11 validation. Ten conversations before any building. |
| Audio quality in real lecture halls | Institutional capture is better than a phone, but rooms are still rooms | Test on real institutional recordings early, not on clean podcast audio |
| Engagement doesn't materialize | Students may read and never post, and reading alone may not justify the price | Measure projects built, not posts. Be willing to reposition as a learning artifact rather than a discussion tool. |
| Capture vendor ships it natively | Panopto adding AI summaries is plausible and would be sudden | Own the consent workflow and the multi-semester corpus, not the summarization |
| Institutional sales cycle outruns runway | Universities buy slowly and pilot slower | Accessibility entry point has an existing budget line; corporate adjacent market as a live option |
| A public deployment produces a bad claim | One misattributed statement damages every instructor relationship at once | Traceability, human approval, no public-by-default |

---

## 11. Validation before building

The evidence base right now is one professor saying no. That is not enough to build on, in either direction.

**This week — ten instructor conversations.** Ask one question: *if you had veto over every line before it published, would you let a tool like this produce a weekly brief for your class?* The professor who prompted this is one data point at the hostile end of the distribution. Ten answers tell you whether this is a company or a feature, and it costs a week of office hours instead of a year of building.

Ask a second question of the ones who say yes: *what would make you actually use the discussion side?*

**In parallel — build the machinery on material you have rights to.** Public conference talks, openly licensed lecture material, or a study group you run. The off-slide delta won't apply to already-published content, but the insight cards, build ideas, prompts, and site all will. Walking into instructor conversation number four with a working artifact rather than a description changes the conversation completely.

**Then — one pilot course, one consenting instructor, one semester.** Success criteria, decided in advance:

- The instructor approves each week's brief in under fifteen minutes
- The instructor renews for a second semester without being asked
- A meaningful share of the class reads it weekly
- At least five students build something from the build ideas and post it
- Zero content incidents requiring retraction

The instructor renewal is the one that matters. If they don't want it again, nothing else on the list saves it.

---

## 12. Open questions

- Does the discussion layer earn its complexity, or is the brief alone the product? A pilot answers this and nothing else does.
- Is accessibility a genuine wedge into the broader sale, or a niche that traps us in a small budget?
- Who owns the generated brief — the instructor, the institution, or us? This needs an answer before the first contract, not after.
- Does this work in courses without dense, story-driven lectures? The off-slide delta may be much thinner in an intro calculus class than in a graduate seminar, which would narrow the addressable market considerably.
- What happens across semesters when a course repeats? Reuse is a real feature and a real rights question.
