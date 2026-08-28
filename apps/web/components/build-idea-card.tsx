import type { BuildIdea } from "@lecturebrief/schema";
import { CopyButton } from "./copy-button";

const EFFORT_LABEL: Record<BuildIdea["effort"], string> = {
  afternoon: "Afternoon",
  weekend: "Weekend",
  multi_week: "Multi-week",
};

/**
 * Effort must be visible before the reader commits attention —
 * ARCHITECTURE.md §10 — so it's the first thing in the card, not a footnote.
 */
export function BuildIdeaCard({ idea, week }: { idea: BuildIdea; week: number }) {
  return (
    <article id={idea.id} className="scroll-mt-20 flex flex-col gap-2 rounded border p-4">
      <span className="w-fit rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-500">
        {EFFORT_LABEL[idea.effort]}
      </span>
      <p className="text-lg font-medium">{idea.title}</p>
      <p className="text-sm text-zinc-700">{idea.pitch}</p>
      <p className="text-sm text-zinc-600">
        <span className="font-medium">You&rsquo;ll learn: </span>
        {idea.you_will_learn}
      </p>
      <div className="flex flex-wrap gap-1">
        {idea.stack_hint.map((s) => (
          <span key={s} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
            {s}
          </span>
        ))}
      </div>
      <div>
        <CopyButton label="Copy link" text={`/w/${week}#${idea.id}`} absolute />
      </div>
    </article>
  );
}
