/**
 * Glossary and assignment-list extraction from syllabus.md.
 *
 * The glossary feeds the correction pass; the assignment list feeds the
 * extract stage's coursework-exclusion self-check (BUILD_PLAN.md Day 4,
 * ARCHITECTURE.md §6.1). In a real course both would come from the
 * instructor's syllabus; here they come from the synthetic one.
 *
 * Parsing is deliberately mechanical rather than model-driven for the
 * glossary: it's a list of comma-separated terms under bold headings, and a
 * model call here would be slower, cost tokens, and occasionally invent a
 * term that was never taught. The assignment list is handed to the model
 * as-is — matching a build idea against it is exactly the kind of semantic
 * judgment (not string matching) that AD-5 also calls for on slide text.
 */

import { readFile } from "node:fs/promises";
import { PATHS } from "./config.js";

export async function loadGlossary(): Promise<string[]> {
  const raw = await readFile(PATHS.syllabus, "utf8");

  // Only the Glossary section; the assignments below it are a separate concern.
  const section = raw.split(/^##\s+Glossary\s*$/m)[1]?.split(/^##\s+/m)[0];
  if (!section) throw new Error("syllabus.md has no '## Glossary' section");

  const terms = new Set<string>();
  for (const line of section.split("\n")) {
    const t = line.trim();
    // Skip headings, bold category labels, prose, and blank lines.
    if (!t || t.startsWith("#") || t.startsWith("**") || t.startsWith(">")) continue;
    if (!t.includes(",")) continue;
    for (const term of t.split(",")) {
      const s = term.trim();
      if (s.length >= 2 && s.length <= 40) terms.add(s);
    }
  }
  return [...terms].sort();
}

/**
 * Raw markdown of the "## Assignments" section — the four assignment
 * descriptions, unparsed. Handed to the extract prompt verbatim; nothing in
 * the pipeline needs these split into records.
 */
export async function loadAssignments(): Promise<string> {
  const raw = await readFile(PATHS.syllabus, "utf8");

  const section = raw.split(/^##\s+Assignments\s*$/m)[1]?.split(/^##\s+/m)[0];
  if (!section) throw new Error("syllabus.md has no '## Assignments' section");
  return section.trim();
}
