---
name: scaffold
description: Create the pnpm workspace layout for LectureBrief — packages/schema, packages/pipeline, prompts, content, apps/web. Run once at the start of Day 1. Trigger on "scaffold the repo", "set up the workspace", "create the project structure".
---

# Scaffold

One-time setup of the layout in `BUILD_PLAN.md` §2.

```
/packages/schema     zod schemas + TS types — imported by pipeline and web
/packages/pipeline   the brief CLI
/prompts             extract.md, reduce.md, verify.md, correct.md
/content             lecture-NN.json — canonical, committed
/apps/web            Next.js App Router site
/.cache              audio-hash-keyed stage cache, gitignored
```

## Steps

1. `pnpm-workspace.yaml` covering `packages/*` and `apps/*`.
2. Root `package.json`: `typescript`, `tsx`, `vitest`, `@types/node`. Scripts for `build`, `test`, `brief`.
3. Root `tsconfig.json` with `strict: true`, `moduleResolution: "bundler"`, path alias `@lecturebrief/schema`.
4. `packages/schema` — `package.json` + `src/index.ts` exporting an empty barrel for now. Real schema lands on Day 3 via `schema-edit`.
5. `packages/pipeline` — `package.json` with a `brief` bin pointing at `src/cli.ts`, `commander` wired up with the subcommands as no-op stubs that print "not implemented": `fetch`, `transcribe`, `correct`, `redact`, `chunk`, `extract`, `reduce`, `verify`, `publish`, `process`.
6. `prompts/` and `content/` with a `.gitkeep` each.
7. `.env.example` with `ANTHROPIC_API_KEY`, `DEEPGRAM_API_KEY`, `ASSEMBLYAI_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`.
8. `pnpm install`, then `pnpm brief --help` to confirm the CLI resolves.

`apps/web` is **not** created here — it lands on Day 5 with `create-next-app`. Building it now means five days of an unused Next.js install in the way.

## Rules

- Stub subcommands now so `pipeline-stage` only ever fills in a body, never wires up plumbing.
- No runtime dependency from `packages/schema` on anything. It is types and zod, nothing else.
