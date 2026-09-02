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

import "dotenv/config";
import { Command } from "commander";
import { PRODUCT_NAME } from "./config.js";
import * as fetchStage from "./stages/fetch.js";
import * as transcribeStage from "./stages/transcribe.js";
import * as correctStage from "./stages/correct.js";
import * as redactStage from "./stages/redact.js";
import * as punctuateStage from "./stages/punctuate.js";
import * as slidesStage from "./stages/slides.js";
import * as extractStage from "./stages/extract.js";
import * as verifyStage from "./stages/verify.js";
import * as assembleStage from "./stages/assemble.js";
import * as publishStage from "./stages/publish.js";
import * as processStage from "./stages/process.js";
import { readCache, sourceIdForWeek } from "./cache.js";
import { loadAssignments } from "./glossary.js";
import { SourceMeta } from "./types.js";

const program = new Command();

program
  .name("brief")
  .description(`${PRODUCT_NAME} pipeline — one lecture at a time`)
  .version("0.0.0");

async function sourceIdFromInput(input: string): Promise<string> {
  if (fetchStage.isLocalSource(input)) return (await fetchStage.run(input)).videoId;
  if (/^local-[a-f0-9]{20}$/.test(input)) return input;
  return fetchStage.parseVideoId(input);
}

program
  .command("fetch")
  .argument("<source>", "YouTube URL/video id or local Voice Memos media file")
  .description("ingest captions or local media metadata")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const meta = await fetchStage.run(url, o);
    console.log(`${meta.videoId}  ${Math.round(meta.durationSec / 60)} min  ${meta.title}`);
  });

program
  .command("transcribe")
  .argument("<source>", "YouTube URL/video id or ingested local media file")
  .description("normalize captions or transcribe local media")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = await sourceIdFromInput(url);
    const source = await readCache(videoId, "source", SourceMeta);
    const { data, fromCache } = await transcribeStage.run(videoId, source, o);
    const provider = source.sourceType === "local" ? transcribeStage.localSttProvider() : "youtube";
    console.log(
      `${videoId}  provider=${provider}  ${data.wordCount} words  ${data.segments.length} segments  ${fromCache ? "(cached)" : "(fresh)"}`,
    );
  });

program
  .command("correct")
  .argument("<source>", "YouTube URL/video id or ingested local media file")
  .description("glossary term substitution, non-destructive")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = await sourceIdFromInput(url);
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

async function pipelineToPunctuated(videoId: string, force?: boolean) {
  const { red } = await pipelineTo(videoId);
  // A previous run that errored leaves an incomplete result; recompute so the
  // per-span cache can fill only the gaps.
  const prior = await punctuateStage.peek(videoId);
  const punctForce = force || (prior?.spansErrored ?? 0) > 0;
  const { data: punct, fromCache } = await punctuateStage.run(videoId, red, { force: punctForce });
  return { red, punct, fromCache };
}

program
  .command("redact")
  .argument("<source>", "YouTube URL/video id or ingested local media file")
  .description("apply redactions/<videoId>.yml before anything downstream sees the text")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = await sourceIdFromInput(url);
    const { red } = await pipelineTo(videoId, o.force);
    console.log(
      `${videoId}  ${red.removedSegments} segments dropped  ${red.removedStrings} strings removed  ${red.segments.length} segments remain`,
    );
  });

program
  .command("punctuate")
  .argument("<source>", "YouTube URL/video id or ingested local media file")
  .description("insert sentence punctuation, guarded by a word-sequence invariant")
  .option("--force", "ignore cache")
  .action(async (url: string, o: { force?: boolean }) => {
    const videoId = await sourceIdFromInput(url);
    const { punct: data, fromCache } = await pipelineToPunctuated(videoId, o.force);
    console.log(
      `${videoId}  ${data.spansTotal} spans  ${data.spansCachedHit} from span-cache  ${data.wordsKept} punctuated  ${data.wordsRestored} restored  ${data.spansErrored} errored${fromCache ? "  (stage cached)" : ""}`,
    );
  });

program
  .command("slides")
  .argument("<week>", "week number")
  .description("extract slide deck text via unpdf")
  .option("--force", "ignore cache")
  .option("--source <pdf-or-url>", "local PDF or remote deck URL")
  .action(async (weekArg: string, o: { force?: boolean; source?: string }) => {
    const week = Number(weekArg);
    const videoId = await sourceIdForWeek(week);
    const { data, fromCache } = await slidesStage.run(videoId, o);
    console.log(
      `week ${week} (${videoId})  ${data.pageCount} pages  ${data.text.length} chars${fromCache ? "  (cached)" : "  (fresh)"}`,
    );
  });

program
  .command("extract")
  .argument("<week>", "week number")
  .description("single-pass extraction from the punctuated transcript (BUILD_PLAN §5 merges map+reduce)")
  .option("--force", "ignore cache")
  .action(async (weekArg: string, o: { force?: boolean }) => {
    const week = Number(weekArg);
    const videoId = await sourceIdForWeek(week);
    const { punct } = await pipelineToPunctuated(videoId);
    const { data: slides } = await slidesStage.run(videoId);
    const exclusions = await loadAssignments();
    const { data, fromCache } = await extractStage.run(
      videoId,
      punct,
      { slidesText: slides.text, exclusions },
      { force: o.force },
    );
    console.log(
      `week ${week} (${videoId})  lead + ${data.insights.length} insights  ${data.buildIdeas.length} build ideas  ${data.agentPrompts.length} agent prompts  ${data.droppedForMissingEvidence} dropped for non-verbatim evidence${fromCache ? "  (cached)" : ""}`,
    );
    console.log(JSON.stringify(data, null, 2));
  });

program
  .command("verify")
  .argument("<week>", "week number")
  .description("isolated grounding check per insight")
  .option("--force", "ignore cache")
  .action(async (weekArg: string, o: { force?: boolean }) => {
    const week = Number(weekArg);
    const videoId = await sourceIdForWeek(week);
    const { data, fromCache } = await verifyStage.run(videoId, { force: o.force });
    console.log(
      `week ${week} (${videoId})  ${1 + data.insights.length} insights survive verification  ${data.droppedForUnsupported} dropped as unsupported${fromCache ? "  (already verified)" : ""}`,
    );
    console.log(JSON.stringify(data, null, 2));
  });

program
  .command("assemble")
  .argument("<week>", "week number")
  .requiredOption("--title <title>", "human-written lecture title")
  .requiredOption("--date <yyyy-mm-dd>", "lecture date")
  .description("assemble the verified extract cache into content/lecture-NN.draft.json")
  .action(async (weekArg: string, o: { title: string; date: string }) => {
    const week = Number(weekArg);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) {
      console.error(`assemble: --date must be YYYY-MM-DD, got "${o.date}"`);
      process.exitCode = 1;
      return;
    }
    const videoId = await sourceIdForWeek(week);
    const { data, path } = await assembleStage.run(videoId, week, { title: o.title, date: o.date });
    console.log(
      `wrote ${path}  lead + ${data.insights.length} insights  ${data.build_ideas.length} build ideas  ${data.agent_prompts.length} agent prompts  status=${data.status}`,
    );
    console.log(`Review it, then copy to content/lecture-${String(week).padStart(2, "0")}.json and hand-edit before approving.`);
  });

program
  .command("publish")
  .argument("<week>", "week number")
  .description("validate publication gates and upsert to Postgres")
  .action(async (weekArg: string) => {
    const week = Number(weekArg);
    const result = await publishStage.run(week);
    console.log(
      `week ${result.week} published  ${result.insightsPublished} insights  ${result.buildIdeasPublished} build ideas  ` +
        `${result.agentPromptsPublished} agent prompts  ${result.droppedRedacted} dropped redacted  ${result.droppedUntested} dropped untested`,
    );
  });

program
  .command("process")
  .argument("<source>", "YouTube URL/video id or local Voice Memos media file")
  .requiredOption("--slides <pdf-or-url>", "local PDF or remote slide-deck URL")
  .requiredOption("--week <n>", "week number")
  .option("--title <title>", "human-written lecture title; defaults to source title")
  .option("--date <yyyy-mm-dd>", "lecture date; defaults to local file date or today")
  .option("--force", "re-run cached stages, including paid transcription")
  .description("run every stage end to end and write a reviewable draft")
  .action(async (source: string, o: { slides: string; week: string; title?: string; date?: string; force?: boolean }) => {
    const result = await processStage.run(source, {
      slides: o.slides,
      week: Number(o.week),
      title: o.title,
      date: o.date,
      force: o.force,
      onStage: (stage) => console.log(`[${stage}]`),
    });
    console.log(`wrote ${result.path}  status=${result.data.status}`);
    console.log("Review the draft, test every prompt, then promote and approve it manually. Nothing was published.");
  });

program.parse();
