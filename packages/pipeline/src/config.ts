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
  extract: "high",
  reduce: "xhigh",
  verify: "low",
} as const;

/** Chunking. See ARCHITECTURE.md AD-4. */
export const CHUNK = {
  windowSeconds: 12 * 60,
  overlapSeconds: 60,
} as const;

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
export const PUNCTUATE_SPAN_CHARS = 1800;
