#!/usr/bin/env tsx
/**
 * The brief CLI. One entry point, run by hand, one operator.
 *
 * Every stage is its own subcommand so it can be re-run off cache without
 * redoing the expensive steps above it. `brief extract` in particular must stay
 * fast — see ARCHITECTURE.md AD-9.
 *
 * Stage bodies land one at a time via the `pipeline-stage` skill.
 */

import { Command } from "commander";
import { PRODUCT_NAME } from "./config.js";
import * as fetchStage from "./stages/fetch.js";
import * as transcribeStage from "./stages/transcribe.js";
import * as correctStage from "./stages/correct.js";
import * as redactStage from "./stages/redact.js";
import * as punctuateStage from "./stages/punctuate.js";
import { readCache } from "./cache.js";
import { SourceMeta } from "./types.js";

const program = new Command();

program
  .name("brief")
  .description(`${PRODUCT_NAME} pipeline — one lecture at a time`)
  .version("0.0.0");

const todo = (stage: string) => () => {
  console.error(`${stage}: not implemented`);
  process.exitCode = 1;
};

program
  .command("fetch")
  .argument("<url>", "talk URL or video id")
  .description("download auto-captions and metadata")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const meta = await fetchStage.run(url, o);
    console.log(`${meta.videoId}  ${Math.round(meta.durationSec / 60)} min  ${meta.title}`);
  });

program
  .command("transcribe")
  .argument("<url>", "talk URL or video id")
  .description("normalize captions into the transcript shape")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = fetchStage.parseVideoId(url);
    const source = await readCache(videoId, "source", SourceMeta);
    const { data, fromCache } = await transcribeStage.run(videoId, source, o);
    console.log(
      `${videoId}  ${data.wordCount} words  ${data.segments.length} segments  ${fromCache ? "(cached)" : "(fresh)"}`,
    );
  });

program
  .command("correct")
  .argument("<url>", "talk URL or video id")
  .description("glossary term substitution, non-destructive")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = fetchStage.parseVideoId(url);
    const source = await readCache(videoId, "source", SourceMeta);
    const { data: tr } = await transcribeStage.run(videoId, source);
    const { data, fromCache } = await correctStage.run(videoId, tr, o);
    console.log(
      `${videoId}  ${data.proposed.length} distinct substitutions  ${data.correctionsLog.length} occurrences  ${fromCache ? "(cached)" : "(fresh)"}`,
    );
    for (const c of data.proposed) console.log(`  APPLIED  ${c.from} -> ${c.to}`);
    for (const c of data.skipped) console.log(`  skipped  ${c.from} -> ${c.to}  (${c.reason})`);
  });

async function pipelineTo(videoId: string, force?: boolean) {
  const source = await readCache(videoId, "source", SourceMeta);
  const { data: tr } = await transcribeStage.run(videoId, source);
  const { data: cor } = await correctStage.run(videoId, tr);
  const { data: red } = await redactStage.run(videoId, cor, { force });
  return { source, tr, cor, red };
}

program
  .command("redact")
  .argument("<url>", "talk URL or video id")
  .description("apply redactions/<videoId>.yml before anything downstream sees the text")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = fetchStage.parseVideoId(url);
    const { red } = await pipelineTo(videoId, o.force);
    console.log(
      `${videoId}  ${red.removedSegments} segments dropped  ${red.removedStrings} strings removed  ${red.segments.length} segments remain`,
    );
  });

program
  .command("punctuate")
  .argument("<url>", "talk URL or video id")
  .description("insert sentence punctuation, guarded by a word-sequence invariant")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = fetchStage.parseVideoId(url);
    const { red } = await pipelineTo(videoId);
    // A previous run that errored leaves an incomplete result; recompute so
    // the per-span cache can fill only the gaps.
    const prior = await punctuateStage.peek(videoId);
    const force = o.force || (prior?.spansErrored ?? 0) > 0;
    const { data, fromCache } = await punctuateStage.run(videoId, red, { force });
    console.log(
      `${videoId}  ${data.spansTotal} spans  ${data.spansCachedHit} from span-cache  ${data.wordsKept} punctuated  ${data.wordsRestored} restored  ${data.spansErrored} errored${fromCache ? "  (stage cached)" : ""}`,
    );
  });

program
  .command("chunk")
  .argument("<week>", "week number")
  .description("split into overlapping windows")
  .option("--force", "ignore cache")
  .action(todo("chunk"));

program
  .command("extract")
  .argument("<week>", "week number")
  .description("map + reduce extraction from cache")
  .option("--force", "ignore cache")
  .action(todo("extract"));

program
  .command("reduce")
  .argument("<week>", "week number")
  .description("reduce window outputs into one document")
  .option("--force", "ignore cache")
  .action(todo("reduce"));

program
  .command("verify")
  .argument("<week>", "week number")
  .description("isolated grounding check per insight")
  .option("--force", "ignore cache")
  .action(todo("verify"));

program
  .command("publish")
  .argument("<week>", "week number")
  .description("validate publication gates and upsert to Postgres")
  .action(todo("publish"));

program
  .command("process")
  .argument("<url>", "talk URL")
  .requiredOption("--slides <pdf>", "path to the slide deck")
  .requiredOption("--week <n>", "week number")
  .description("run every stage end to end")
  .action(todo("process"));

program.parse();
