/** End-to-end orchestration. Human approval and publication are intentionally excluded. */

import { registerWeekSource } from "../cache.js";
import { loadAssignments } from "../glossary.js";
import * as assembleStage from "./assemble.js";
import * as correctStage from "./correct.js";
import * as extractStage from "./extract.js";
import * as fetchStage from "./fetch.js";
import * as punctuateStage from "./punctuate.js";
import * as redactStage from "./redact.js";
import * as slidesStage from "./slides.js";
import * as transcribeStage from "./transcribe.js";
import * as verifyStage from "./verify.js";

export interface ProcessOptions {
  slides: string;
  week: number;
  title?: string;
  date?: string;
  force?: boolean;
  onStage?: (stage: string) => void;
}

function defaultDate(recordedAt?: string): string {
  return (recordedAt ?? new Date().toISOString()).slice(0, 10);
}

export async function run(sourceInput: string, options: ProcessOptions) {
  if (!Number.isInteger(options.week) || options.week < 1) {
    throw new Error(`process: --week must be a positive integer, got "${options.week}"`);
  }
  const stage = (name: string) => options.onStage?.(name);

  stage("ingest");
  const source = await fetchStage.run(sourceInput, { force: options.force });
  const sourceId = source.videoId;
  await registerWeekSource(options.week, sourceId);

  stage("transcribe");
  const { data: transcript } = await transcribeStage.run(sourceId, source, { force: options.force });
  stage("correct");
  const { data: corrected } = await correctStage.run(sourceId, transcript, { force: options.force });
  stage("redact");
  const { data: redacted } = await redactStage.run(sourceId, corrected, { force: options.force });
  stage("punctuate");
  const { data: punctuated } = await punctuateStage.run(sourceId, redacted, { force: options.force });
  stage("slides");
  const { data: slides } = await slidesStage.run(sourceId, { source: options.slides, force: options.force });
  stage("extract");
  const exclusions = await loadAssignments();
  await extractStage.run(
    sourceId,
    punctuated,
    { slidesText: slides.text, exclusions },
    { force: options.force },
  );
  stage("verify");
  await verifyStage.run(sourceId, { force: options.force });

  const date = options.date ?? defaultDate(source.recordedAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`process: --date must be YYYY-MM-DD, got "${date}"`);
  }
  stage("assemble");
  return assembleStage.run(sourceId, options.week, {
    title: options.title?.trim() || source.title,
    date,
  });
}
