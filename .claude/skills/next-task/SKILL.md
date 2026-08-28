---
name: next-task
description: Pick up the next unchecked item in BUILD_PLAN.md and do exactly that one thing, then tick the box. Use to start or resume a work session on this project. Trigger on "what's next", "keep going", "continue the build", "next step", "resume", or a bare "go".
---

# Next task

You are implementing LectureBrief one checklist item at a time. This skill is the driver; the others do the work.

## Procedure

1. Read `BUILD_PLAN.md`. Walk §3 top to bottom and find the **first unchecked `- [ ]`**.
2. **Do not skip ahead.** The `*Gate:*` line at the end of each day is a hard stop — if the current day has unchecked items, nothing from a later day is eligible, even if it looks easier or more interesting.
3. State the item verbatim before starting, so it's obvious what's in scope.
4. Route it to the right skill:

   | Item is about | Skill |
   |---|---|
   | repo layout, workspace, tsconfig, first-time setup | `scaffold` |
   | a CLI stage: fetch, transcribe, correct, redact, chunk, extract, reduce, verify, publish | `pipeline-stage` |
   | the zod data contract in `packages/schema` | `schema-edit` |
   | authoring or revising anything in `/prompts` | `prompt-file` |
   | Day 6 iteration, reading extraction output, tuning for quality | `prompt-tune` |
   | a Next.js route, page, or component | `web-route` |
   | a test that enforces a publication or grounding rule | `invariant-test` |
   | auditing one lecture JSON before approving it | `check-lecture` |
   | anything else | just do it directly |

5. Do the item. **One item per invocation.** Do not batch a day's worth because they look small — the gates exist so that a broken assumption surfaces before it's built on.
6. When it's done and actually verified (tests run, command executed, page loaded — not "should work"), edit `BUILD_PLAN.md` to change that item's `- [ ]` to `- [x]`.
7. Hand off to `commit`.

## Rules

- Ticking a box is a claim that the thing works. If you couldn't verify it, leave it unchecked and say why.
- Items marked **bold** in the plan are the load-bearing ones. If one of those is the current item, do not simplify it to get through the checklist.
- If an item turns out to be wrong or impossible as written, stop and say so rather than silently substituting something else. `BUILD_PLAN.md` §1 and `ARCHITECTURE.md` §0 both say this; it is the main way this project fails.
- Day 6 is prompt work only. If the current item is under Day 6, **no code changes are permitted** — see `prompt-tune`.
