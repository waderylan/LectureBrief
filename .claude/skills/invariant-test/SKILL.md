---
name: invariant-test
description: Write a vitest test enforcing one publication or grounding invariant. Trigger on "add a test for the draft gate", "test that redacted items don't publish", "write the evidence substring test", "test slug stability".
---

# Invariant test

These tests are the mechanism behind the promise the product rests on. A rule that lives only in the operator's discipline gets broken eventually by a tired person deploying at 1am.

One invariant per invocation. **Write the test so it fails first**, then make it pass.

## The invariants

**Publication gates** — enforced in `brief publish`, which is the only path content takes to the database.

| Invariant | Test |
|---|---|
| A lecture not `approved` cannot publish | Build a `draft` lecture, run publish, assert it throws and the DB is untouched |
| A `redacted` item cannot publish | Lecture with one redacted insight, one redacted build idea, one redacted prompt — assert none reach the DB |
| A prompt with `tested: false` cannot publish | Assert it's dropped while its sibling `tested: true` prompt survives |

**Grounding**

| Invariant | Test |
|---|---|
| Every `evidence` span is verbatim | Exact substring match against the corrected transcript, for every published item |
| Every build idea and prompt has non-empty `origin.evidence` | Assert on all of them |
| No blocklisted name reaches the output | Grep the built output against the blocklist file |

**Identity**

| Invariant | Test |
|---|---|
| Re-running extraction preserves ids for unchanged items | Extract, capture ids, re-extract, assert ids match |
| Re-publishing does not orphan comments | Publish, attach a comment to an item, re-publish the same lecture, assert the comment still resolves to that item |

That last one is the one people skip. It's the reason slug stability is a data-integrity requirement here and not just link hygiene.

## Rules

- Test the real `publish` function against a real test database. A test against a mock proves the mock works.
- Fixtures live in `packages/pipeline/test/fixtures/` as realistic lecture JSON, not minimal stubs — a stub won't catch a field the real path forgets to filter.
- Assert on **absence from the database**, not on a returned filter result. The thing that matters is what a reader can reach.
