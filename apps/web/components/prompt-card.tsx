import type { AgentPrompt } from "@lecturebrief/schema";
import type { CommentView } from "@/app/actions/comments";
import { CopyButton } from "./copy-button";
import { CommentThread } from "./comment-thread";

/**
 * Prerequisites render above the prompt body, not below — ARCHITECTURE.md §10:
 * a reader needs to know what must exist before they paste this anywhere.
 */
export function PromptCard({
  prompt,
  week,
  comments = [],
  signedIn = false,
}: {
  prompt: AgentPrompt;
  week: number;
  comments?: CommentView[];
  signedIn?: boolean;
}) {
  return (
    <article id={prompt.id} className="editorial-card scroll-mt-20 flex flex-col gap-3 border p-5 sm:p-7">
      <p className="font-editorial text-2xl font-bold leading-tight sm:text-3xl">{prompt.title}</p>
      <p className="text-sm leading-6 text-[#413d37] sm:text-base">{prompt.what_it_does}</p>
      {prompt.prerequisites.length > 0 && (
        <div className="text-sm text-zinc-600">
          <span className="font-medium">Prerequisites: </span>
          {prompt.prerequisites.join(", ")}
        </div>
      )}
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap border border-[#c9c1b4] bg-[#eee8de] p-4 text-sm leading-6 break-words text-[#292620]">{prompt.prompt}</pre>
      <div className="flex items-center gap-4">
        <CopyButton label="Copy prompt" text={prompt.prompt} />
        <CopyButton label="Copy link" text={`/w/${week}#${prompt.id}`} absolute />
      </div>
      <CommentThread itemId={prompt.id} initialComments={comments} signedIn={signedIn} />
    </article>
  );
}
