import type { BuildIdea } from "@lecturebrief/schema";
import type { CommentView } from "@/app/actions/comments";
import { CopyButton } from "./copy-button";
import { CommentThread } from "./comment-thread";

const EFFORT_LABEL: Record<BuildIdea["effort"], string> = {
  afternoon: "Afternoon",
  weekend: "Weekend",
  multi_week: "Multi-week",
};

/**
 * Effort must be visible before the reader commits attention —
 * ARCHITECTURE.md §10 — so it's the first thing in the card, not a footnote.
 */
export function BuildIdeaCard({
  idea,
  week,
  comments = [],
  signedIn = false,
  commentsEnabled = true,
}: {
  idea: BuildIdea;
  week: number;
  comments?: CommentView[];
  signedIn?: boolean;
  commentsEnabled?: boolean;
}) {
  return (
    <article id={idea.id} className="editorial-card scroll-mt-20 flex flex-col gap-3 border p-5 sm:p-7">
      <span className="w-fit border border-[#81796d] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f6a61]">
        {EFFORT_LABEL[idea.effort]}
      </span>
      <p className="font-editorial text-2xl font-bold leading-tight sm:text-3xl">{idea.title}</p>
      <p className="text-sm leading-6 text-[#413d37] sm:text-base">{idea.pitch}</p>
      <p className="text-sm text-[#6f6a61]">
        <span className="font-medium">You&rsquo;ll learn: </span>
        {idea.you_will_learn}
      </p>
      <div className="flex flex-wrap gap-1">
        {idea.stack_hint.map((s) => (
          <span key={s} className="bg-[#e8e1d6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#5f5a52]">
            {s}
          </span>
        ))}
      </div>
      <div>
        <CopyButton label="Copy link" text={`/w/${week}#${idea.id}`} absolute />
      </div>
      <CommentThread itemId={idea.id} initialComments={comments} signedIn={signedIn} enabled={commentsEnabled} />
    </article>
  );
}
