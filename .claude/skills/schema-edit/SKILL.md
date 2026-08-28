---
name: schema-edit
description: Add or change a field in the zod data contract at packages/schema, the interface between pipeline and site. Trigger on "add a field to the schema", "change the lecture type", "update the data contract", "freeze the schema".
---

# Schema edit

`packages/schema` is the contract from `ARCHITECTURE.md` §9. Pipeline and site both import it; it is the only shared type surface.

## Procedure

1. Edit `packages/schema/src/index.ts`. Zod schema first, TS type inferred from it via `z.infer` — never hand-write a parallel interface.
2. Re-validate every file in `/content` against the new schema. If any fails, either the change is wrong or those files need a migration — decide which and say so.
3. Update whichever pipeline stage produces the field and whichever web component renders it. A field that nothing writes and nothing reads should not exist.
4. Run `pnpm test`.

## Rules

- **After the Day 3 freeze, every change needs a stated reason.** The schema is frozen so both sides can be built against it; changing it mid-Day-5 means the site was built on a fiction. If a change is genuinely needed, say what forced it.
- **Never change the shape of an `id`.** Ids are URL anchors and comment foreign keys. Changing how they're minted orphans threads and breaks every shared link. See `invariant-test`.
- Fields carrying grounding — `evidence`, `timestamp`, `origin` — are never optional. If a stage can't populate one, the item doesn't get created.
- Enums stay closed: `slide_relation`, `stance`, `speaker`, `verification`, `effort`, `status`. Adding a variant means the site must handle it before the pipeline can emit it.
- Add nothing speculative. A field for a v2 feature is a field that will be wrong by the time v2 arrives.
