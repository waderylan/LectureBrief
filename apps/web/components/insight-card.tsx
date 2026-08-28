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
      className={`editorial-card scroll-mt-20 flex flex-col gap-3 border p-5 sm:p-7 ${lead ? "border-black sm:p-9" : ""}`}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6f6a61]">
        <span className="border border-[#81796d] px-2 py-1">{STANCE_LABEL[insight.stance]}</span>
        {insight.verification === "partially_supported" && (
          <span className="border border-amber-500 px-2 py-1 text-amber-800">
            Partially supported
          </span>
        )}
      </div>
      <p className={`font-editorial font-bold leading-tight ${lead ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>{insight.claim}</p>
      {insight.context && <p className="max-w-3xl text-sm leading-6 text-[#5f5a52] sm:text-base">{insight.context}</p>}
      <blockquote className="border-l-2 border-[#d9362b] pl-4 font-editorial text-base italic leading-6 text-[#6f6a61]">&ldquo;{insight.evidence}&rdquo;</blockquote>
      <div className="flex items-center gap-1 flex-wrap">
        {insight.tags.map((tag) => (
          <span key={tag} className="bg-[#e8e1d6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#5f5a52]">
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
