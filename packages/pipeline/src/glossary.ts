/**
 * Glossary extraction from syllabus.md.
 *
 * The glossary feeds the correction pass. In a real course it would come from
 * the instructor's syllabus; here it comes from the synthetic one.
 *
 * Parsing is deliberately mechanical rather than model-driven: this is a list of
 * comma-separated terms under bold headings, and a model call here would be
 * slower, cost tokens, and occasionally invent a term that was never taught.
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
