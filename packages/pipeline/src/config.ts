/**
 * Single source of truth for anything that changes when the project is renamed
 * or retargeted. The product name is a placeholder — keep it here rather than
 * inline so a rename is one edit.
 */

/** Placeholder. Expected to change. */
export const PRODUCT_NAME = "LectureBrief";

/** Directory layout, all relative to the repo root. */
export const PATHS = {
  cache: ".cache",
  content: "content",
  prompts: "prompts",
  syllabus: "syllabus.md",
  redactions: "redactions",
} as const;

/** Model and effort per stage. See BUILD_PLAN.md §5. */
export const MODEL = "claude-opus-5" as const;

export const EFFORT = {
  correct: "low",
  punctuate: "low",
  // Map and reduce are one call now (BUILD_PLAN §5) — "medium" per that table.
  extract: "medium",
  verify: "low",
} as const;

/**
 * Maps the CLI's `<week>` argument (extract/reduce/verify/publish/process) to
 * the videoId that keys `.cache/<videoId>`. Every stage before extract is
 * already keyed by videoId directly; this table is the one place a talk's
 * release-sequence number is decided. See SOURCES.md for the three talks.
 */
export const TALK_WEEKS: Readonly<Record<number, string>> = {
  1: "zOkou37L2Wo", // Logs Told Us It Was DNS (Malla/Andrews)
  2: "qmt0ouHFgwY", // Hacking the Pachyderm (Weakly/Doster)
  3: "DJ4d_PZ6Gns", // So You Wanna Go Fast? (Treat)
};

export function videoIdForWeek(week: number): string {
  const id = TALK_WEEKS[week];
  if (!id) throw new Error(`No talk registered for week ${week}. See TALK_WEEKS in config.ts.`);
  return id;
}

/**
 * Names that must never appear in published output. Kept as a list rather than
 * hardcoded so it survives a change of source material. See ARCHITECTURE.md AD-10.
 */
export const NAME_BLOCKLIST: readonly string[] = [];

/**
 * Fail loudly rather than silently burning money on a looping prompt bug.
 * See ARCHITECTURE.md §7.3.
 */
export const COST_GUARD_MULTIPLIER = 10;

/** Absolute path to the standalone yt-dlp binary. */
export const YT_DLP =
  process.env["YT_DLP"] ??
  `${process.env["USERPROFILE"] ?? process.env["HOME"]}/.local/bin/yt-dlp.exe`;

/** Caption events are word fragments; group them up to this length. */
export const SEGMENT_MAX_CHARS = 200;

/** Characters per span sent to the punctuation pass. */
export const PUNCTUATE_SPAN_CHARS = 8000;

/**
 * Attempts per punctuation span. Each retry names the specific word the model
 * changed, and a later attempt often diverges somewhere new, so more than one
 * retry genuinely helps.
 */
export const PUNCTUATE_ATTEMPTS = 4;
