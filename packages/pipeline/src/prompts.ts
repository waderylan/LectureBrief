/**
 * Prompt loading. Prompts are markdown files in /prompts, versioned and
 * diffable — never TypeScript strings. See ARCHITECTURE.md §8.
 *
 * Each file has a `# name@version` heading, a `## System` section, and a
 * `## User template` section with `{{placeholders}}`.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PATHS } from "./config.js";

export interface Prompt {
  version: string;
  system: string;
  template: string;
}

const cache = new Map<string, Prompt>();

export async function loadPrompt(name: string): Promise<Prompt> {
  const hit = cache.get(name);
  if (hit) return hit;

  const raw = await readFile(join(PATHS.prompts, `${name}.md`), "utf8");

  const version = raw.match(/^#\s*(\S+@\S+)/m)?.[1];
  if (!version) throw new Error(`${name}.md is missing its '# name@version' heading`);

  const system = raw.match(/^##\s*System\s*$([\s\S]*?)^##\s/m)?.[1]?.trim();
  const template = raw.match(/^##\s*User template\s*$([\s\S]*)$/m)?.[1]?.trim();
  if (!system || !template) {
    throw new Error(`${name}.md must contain '## System' and '## User template' sections`);
  }

  const p: Prompt = { version, system, template };
  cache.set(name, p);
  return p;
}

/** Substitutes `{{key}}` placeholders. Throws if any are left unfilled. */
export function fill(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  const missing = out.match(/\{\{(\w+)\}\}/);
  if (missing) throw new Error(`Unfilled placeholder in prompt: ${missing[0]}`);
  return out;
}
