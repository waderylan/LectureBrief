import type { Insight } from "@lecturebrief/schema";
import type { CommentView } from "@/app/actions/comments";
import { CopyButton } from "./copy-button";
import { CommentThread } from "./comment-thread";

const STANCE_LABEL: Record<Insight["stance"], string> = {
  asserted: "Said",
  speculated: "Speculated",
  attributed: "Attributed",
  opinion: "Opinion",
};

/**
 * `stance` and a `partially_supported` hedge must be visually distinguishable
 * from a plain claim — ARCHITECTURE.md §5. Not merged with build-idea/prompt
 * cards: an insight's fields (evidence, stance, verification) don't apply to
 * either of those.
 */
export function InsightCard({
  insight,
  week,
  lead = false,
  comments = [],
  signedIn = false,
}: {
  insight: Insight;
  week: number;
  lead?: boolean;
  comments?: CommentView[];
  signedIn?: boolean;
}) {
  return (
    <article
      id={insight.id}
      className={`scroll-mt-20 flex flex-col gap-2 rounded border p-4 ${lead ? "border-black" : ""}`}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
        <span className="rounded-full border px-2 py-0.5">{STANCE_LABEL[insight.stance]}</span>
        {insight.verification === "partially_supported" && (
          <span className="rounded-full border border-amber-400 px-2 py-0.5 text-amber-700">
            Partially supported
          </span>
        )}
      </div>
      <p className={lead ? "text-2xl font-semibold" : "text-lg font-medium"}>{insight.claim}</p>
      {insight.context && <p className="text-sm text-zinc-600">{insight.context}</p>}
      <blockquote className="border-l-2 pl-3 text-sm italic text-zinc-500">&ldquo;{insight.evidence}&rdquo;</blockquote>
      <div className="flex items-center gap-1 flex-wrap">
        {insight.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {tag}
          </span>
        ))}
      </div>
      <div>
        <CopyButton label="Copy link" text={`/w/${week}#${insight.id}`} absolute />
      </div>
      <CommentThread itemId={insight.id} initialComments={comments} signedIn={signedIn} />
    </article>
  );
}
