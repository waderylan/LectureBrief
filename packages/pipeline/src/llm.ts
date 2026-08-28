/**
 * LLM adapter.
 *
 * MVP backend is headless Claude Code (`claude -p`), which bills against the
 * operator's existing subscription rather than API credits. Production would
 * swap this for the Anthropic SDK — that is the only reason this file exists as
 * a seam rather than the call being inlined.
 *
 * Measured overhead is ~22k tokens of harness context per invocation, which is
 * the floor: `--bare` would cut it but refuses OAuth and requires an API key.
 * Every flag below is doing work; see the notes on each.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ZodType } from "zod";

const exec = promisify(execFile);

export type Effort = "low" | "medium" | "high";

export interface CallOptions {
  /** Replaces the Claude Code system prompt entirely. Keep it a function spec. */
  system: string;
  /** The payload. Transcript chunk, window outputs, claim+evidence pair. */
  user: string;
  /** See BUILD_PLAN §5. Cheap mechanical passes go low. */
  effort?: Effort;
  model?: string;
  /** Milliseconds. A stage that hangs should fail, not wait forever. */
  timeoutMs?: number;
}

export interface CallResult<T> {
  data: T;
  costUsd: number;
  durationMs: number;
}

/** Models write ```json fences no matter how firmly you ask them not to. */
function stripFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  return (m?.[1] ?? t).trim();
}

function buildArgs(o: CallOptions): string[] {
  return [
    "-p",
    o.user,
    "--model",
    o.model ?? "sonnet",
    "--effort",
    o.effort ?? "medium",
    "--output-format",
    "json",
    // Drops ~10k tokens of tool definitions. Nothing here needs tools.
    "--allowed-tools",
    "",
    // Without these, a configured-but-unreachable MCP server stalls every call
    // for its full connect timeout — 30s each, silently.
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    // Keeps the operator's global CLAUDE.md out of extraction context.
    "--setting-sources",
    "",
    "--system-prompt",
    o.system,
  ];
}

/**
 * One structured call. Validates against `schema`; retries once on a parse or
 * validation failure, appending the error so the model can correct itself.
 */
export async function callJson<T>(
  schema: ZodType<T>,
  o: CallOptions,
): Promise<CallResult<T>> {
  const started = Date.now();
  let lastErr = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const opts =
      attempt === 0
        ? o
        : {
            ...o,
            user: `${o.user}\n\nYour previous response was rejected: ${lastErr}\nReturn only valid JSON matching the schema.`,
          };

    const { stdout } = await exec("claude", buildArgs(opts), {
      timeout: o.timeoutMs ?? 180_000,
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });

    const envelope = JSON.parse(stdout) as {
      result?: string;
      is_error?: boolean;
      subtype?: string;
      total_cost_usd?: number;
    };

    if (envelope.is_error) {
      lastErr = `claude returned ${envelope.subtype ?? "an error"}`;
      continue;
    }

    const parsed = schema.safeParse(
      JSON.parse(stripFence(envelope.result ?? "")),
    );
    if (parsed.success) {
      return {
        data: parsed.data,
        costUsd: envelope.total_cost_usd ?? 0,
        durationMs: Date.now() - started,
      };
    }
    lastErr = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  }

  throw new Error(`LLM call failed validation twice: ${lastErr}`);
}
