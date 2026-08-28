import type { AgentPrompt } from "@lecturebrief/schema";
import { CopyButton } from "./copy-button";

/**
 * Prerequisites render above the prompt body, not below — ARCHITECTURE.md §10:
 * a reader needs to know what must exist before they paste this anywhere.
 */
export function PromptCard({ prompt, week }: { prompt: AgentPrompt; week: number }) {
  return (
    <article id={prompt.id} className="scroll-mt-20 flex flex-col gap-2 rounded border p-4">
      <p className="text-lg font-medium">{prompt.title}</p>
      <p className="text-sm text-zinc-700">{prompt.what_it_does}</p>
      {prompt.prerequisites.length > 0 && (
        <div className="text-sm text-zinc-600">
          <span className="font-medium">Prerequisites: </span>
          {prompt.prerequisites.join(", ")}
        </div>
      )}
      <pre className="whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm text-zinc-800">{prompt.prompt}</pre>
      <div className="flex items-center gap-4">
        <CopyButton label="Copy prompt" text={prompt.prompt} />
        <CopyButton label="Copy link" text={`/w/${week}#${prompt.id}`} absolute />
      </div>
    </article>
  );
}
