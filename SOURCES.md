# Source material

Day 0 record. Every URL below was fetched and verified; every deck was downloaded, page-counted, and its title slide text-extracted to confirm it belongs to the talk. Nothing here is inferred from a naming pattern.

**Standing caveat on licensing:** none of these carry an explicit reuse grant. USENIX states that video and slides are "free and open to everyone" — that is an access statement, not a license. Treat all three as: fine for a private/unlisted demo, not cleared for a public artifact. Revisit before removing `noindex`.

---

## 1. Logs Told Us It Was DNS, It Looked like DNS, It Had to Be DNS, It Wasn't DNS

- **Speakers:** Hemanth Malla, Elijah Andrews (Datadog)
- **Conference:** SREcon23 Americas (USENIX), 2023-03-21
- **Duration:** 38:22
- **Video:** https://www.youtube.com/watch?v=zOkou37L2Wo
- **Talk page:** https://www.usenix.org/conference/srecon23americas/presentation/malla
- **Deck:** https://www.usenix.org/sites/default/files/conference/protected-files/sre23amer_slides_andrews.pdf
- **Deck verification:** HTTP 200, 2,300,506 bytes, `application/pdf`, 86 pages, no login. Title slide decodes to "Logs Told Us It Was DNS, It Had To Be DNS, It Wasn't DNS — Elijah Andrews, Hemanth Malla — SREcon23 Americas, Santa Clara."
- **License as found:** USENIX open-access statement ("Any video, audio, and/or slides that are posted after the event are also free and open to everyone"). No CC mark on the page or in the PDF. Video: standard YouTube license, no explicit reuse grant.
- **Why it suits an off-slide delta:** A four-week debugging narrative with dead ends and wrong hypotheses. The abstract itself signals the shape: "Four weeks later: We are reading kernel code to understand the corner cases of dropping Martian packets." Resolution is a punchline — "we finally addressed the incident by simply removing three lines of code." 86 slides over 38 minutes means the wrong turns are narrated, not printed.
- **Concerns:** Two speakers alternating — diarization matters here.

## 2. Hacking the Pachyderm: Scaling Servers and People

- **Speakers:** Hazel Weakly (Hachyderm), Preston Doster (Hachyderm / Twilio)
- **Conference:** SREcon23 Americas (USENIX), 2023-03-21
- **Duration:** 39:48
- **Video:** https://www.youtube.com/watch?v=qmt0ouHFgwY
- **Talk page:** https://www.usenix.org/conference/srecon23americas/presentation/weakly
- **Deck:** https://www.usenix.org/sites/default/files/conference/protected-files/sre23amer_slides_weakly.pdf
- **Deck verification:** HTTP 200, 2,297,073 bytes, 49 pages. Title slide decodes to "Hacking the Pachyderm" with a `hachyderm` reference.
- **License as found:** Same USENIX open-access statement. Standard YouTube license, no explicit reuse grant.
- **Why it suits an off-slide delta:** The Mastodon migration told from inside it — Hachyderm went from 700 to 30,000 users in a month during the November 2022 Twitter exodus, migrating a distributed system across the Atlantic amid ongoing failures. 49 slides over 40 minutes (~49 s/slide) is the structural signature of a talk carried by the telling. The organizational half ("the hardest problems to solve are the social ones," "nobody burned out") is almost certainly spoken rather than bulleted.
- **Concerns:** Lowest slide count of the three, so the deck gives the extractor the least to align against. Good for the delta, harder for grounding.

## 3. So You Wanna Go Fast?

- **Speaker:** Tyler Treat (Workiva)
- **Conference:** Strange Loop 2017, September 2017
- **Duration:** 38:22
- **Video:** https://www.youtube.com/watch?v=DJ4d_PZ6Gns
- **Deck:** https://speakerdeck.com/tylertreat/so-you-wanna-go-fast
  - Direct PDF: https://files.speakerdeck.com/presentations/9f154cf3feb04d0092b6313bc33987de/go_fast.pdf
  - Mirror: https://github.com/strangeloop/StrangeLoop2017/raw/master/slides/TylerTreat-SoYouWannaGoFast.pdf (byte-identical size)
  - Mirror: https://www.slideshare.net/TylerTreat/so-you-wanna-go-fast-80300458
- **Deck verification:** HTTP 200, 40,958,192 bytes, 169 pages. Title slide decodes to "So You Wanna Go Fast? Strange Loop 2017 @tyler_treat" — confirms this is the Strange Loop delivery specifically, not another run of the same talk.
- **License as found:** **Weakest of the three.** No license file or statement in the `strangeloop/StrangeLoop2017` repo. Strange Loop's `2011-slides` README states slides are copyright the speaker, all rights reserved unless the author says otherwise; nothing supersedes that for 2017. No CC marking on Speaker Deck. Video: standard YouTube license.
- **Why it suits an off-slide delta:** 169 slides over 38 minutes (~13 s/slide) is a rapid-fire visual deck that cannot be read aloud — close to an ideal shape for this pipeline. Opinionated distributed-messaging experience report from the author of the NATS benchmarking work.
- **Concerns:** 2017, so specifics have aged. 40 MB / 169 pages may stress slide ingestion. Weakest license position.

---

## Verified reserves

All SREcon23 Americas, all decks downloaded and confirmed. Use for a fourth run or a swap.

| Talk | Speaker | Duration | Deck |
|---|---|---|---|
| Watering the Roots of Resilience | Kelly Shortridge | 40:32 | 111 pages, title slide confirmed |
| Why This Stuff Is Hard | Lorin Hochstein (Netflix) | 29:30 | 81 pages, title slide confirmed |
| Epic Incidents of History: The 1979 NORAD Nuclear Near Miss | Ricardo Travaglini | 31:56 | verified |
| Confessions of an SRE Manager | Hatch | 30:49 | verified |
| We're Still Down: A Metastable Failure Tale | Ruben Lexmond | 25:10 | verified — pure incident narrative, short |
| The Revolution Will Not Be Terraformed | Vince Parker | 19:07 | verified — dropped only on the 20-min floor |

## Rejected, with reason

**No standalone deck published** — the binding constraint:
- Charity Majors, SREcon23 — video only, no slides link
- Emily Nash, SREcon23 — video only
- Chandler Carruth, "Spectre: Secrets, Side-Channels, Sandboxes, and Security," CppCon 2018 — would have been excellent; full recursive tree of `CppCon/CppCon2018` (375 entries) contains no Carruth material
- Chandler Carruth, "There Are No Zero-cost Abstractions," CppCon 2019 — 118 PDFs in the repo, none his
- Eugene Yan, "What We Learned from a Year of Building with LLMs," AI Engineer World's Fair 2024 — his writeup says "here are the slides" but ships no resolvable URL
- Ali Rahimi, NIPS 2017 Test-of-Time — no deck found, and only ~15 minutes
- Strange Loop 2019 / 2021 repos — no slides directory; 2018 has `.md` pointers rather than decks
- InfoQ / QCon — no systematic standalone slide PDF; pages surface video plus transcript

**Verified but under the 20-minute floor:** Avoiding Cachepocalypse in the Land of the Monolith (11:49); Incident Archaeology (18:33).

**Deck but no video:** What Does "High Priority" Mean? (Magliola).

---

## Structural finding

Across ~50 talks at SREcon23 Americas, roughly 30 had both a standalone slides PDF and a video. Adding the 30–60 minute window and a genuine war-story shape cut that to about eight.

Outside USENIX the hit rate collapses: Strange Loop publishes decks for some years and some speakers, CppCon's GitHub repos are missing exactly the marquee speakers, and neither AI Engineer nor the PyData family yielded anything verifiable end to end.

**SREcon — any year, Americas or EMEA — is the vein to mine. Treat everything else as a one-off.**

**Open question:** all verified candidates are SRE/infrastructure, not ML/AI. The pipeline works the same either way, but the generated build ideas and agent prompts will be about distributed systems and incident response rather than agents and LLMs. Decide whether that suits the audience for the demo before Day 1.
