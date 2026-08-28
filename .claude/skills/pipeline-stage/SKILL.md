---
name: pipeline-stage
description: Implement one cached stage of the brief CLI — fetch, transcribe, correct, redact, chunk, extract, reduce, verify, or publish. Trigger on "implement the transcribe stage", "add the chunking step", "build brief correct", or any single pipeline stage by name.
---

# Pipeline stage

Implement exactly one stage. One stage per invocation.

## Contract every stage follows

- Lives in `packages/pipeline/src/stages/<stage>.ts`, exporting `async function run(input, opts)`.
- Reads its input from the previous stage's cache file. Writes `.cache/<audio-hash>/<stage>.json`.
- **If the output file exists, skip and return it — unless `--force`.** This is what makes iteration cheap and it is not optional.
- Input and output both validated against zod schemas from `@lecturebrief/schema`.
- Registered in `src/cli.ts` as its own subcommand so it can be run standalone off cache.
- Never calls another stage directly. The CLI composes them; `brief process` is the only thing that chains.

## Per-stage specifics

| Stage | Notes |
|---|---|
| `fetch` | `yt-dlp` then `ffmpeg` to 16kHz mono wav. Hash the audio; that hash keys every downstream cache dir. |
| `transcribe` | Provider from `BAKEOFF.md`. Keyterm boosting from the glossary, diarization on. Word-level timestamps. Never re-transcribes a cached hash. |
| `correct` | Term substitutions only — see `prompt-file`. Writes corrected transcript **alongside** raw, plus `corrections_log` of `{from, to, timestamp}`. Non-destructive. |
| `redact` | Applies `redactions.yml` (timestamp ranges + literal strings). Runs **before** anything extraction-facing ever sees the text. |
| `chunk` | ~12-minute windows, ~1 minute overlap. Carries timestamps through. |
| `extract` | Map: one structured call per window. Slides + glossary + exclusion list in the stable cached prefix, window text after it. |
| `reduce` | One call over all window outputs. Dedup, rank, pick `lead_insight`, callbacks, build ideas, prompts. |
| `verify` | Per insight, isolated call seeing **only** claim + evidence. Drops `unsupported`, hedges `partially_supported`. |
| `publish` | Validates, applies the publication gates, upserts to Postgres. See `invariant-test` for what it must refuse. |

## Rules

- Structured LLM output uses `client.messages.parse()` with `zodOutputFormat`, model `claude-opus-5`, effort per `BUILD_PLAN.md` §5.
- Prompts come from `/prompts/*.md` read at runtime. Never inline a prompt as a TypeScript string.
- Timestamps survive every stage. Everything downstream depends on them.
- After implementing, run the stage on real cached input and show the actual output. A stage that compiles is not a stage that works.
