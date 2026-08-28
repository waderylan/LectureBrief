import type { LectureView } from "@/lib/lectures";
import { getCommentsForItems } from "@/lib/lectures";
import { auth } from "@/auth";
import { InsightCard } from "./insight-card";
import { BuildIdeaCard } from "./build-idea-card";
import { PromptCard } from "./prompt-card";
import { SideProjectsLabel } from "./side-projects-label";

/**
 * Section order is fixed by ARCHITECTURE.md §10 and is not chronological:
 * the lead insight and the applied sections (build/prompts) sit above
 * callbacks/glossary/announcements, which sit above the collapsed on-slides
 * recap. Reordering this "to improve it" is explicitly the thing not to do.
 */
export async function LecturePage({ lecture }: { lecture: LectureView }) {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  const allItemIds = [
    lecture.leadInsight.id,
    ...lecture.offSlides.map((i) => i.id),
    ...lecture.onSlides.map((i) => i.id),
    ...lecture.buildIdeas.map((b) => b.id),
    ...lecture.agentPrompts.map((p) => p.id),
  ];
  const commentsByItem = await getCommentsForItems(allItemIds);

  return (
    <article className="page-shell flex flex-col gap-14 py-10 sm:py-14">
      <header className="border-b border-black pb-8 text-center sm:pb-10">
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6f6a61]">
          Week {lecture.week} <span className="px-2 text-[#d9362b]">●</span> {lecture.date}
        </p>
        <h1 className="font-editorial mx-auto max-w-4xl break-words text-4xl font-bold leading-[0.98] sm:text-6xl lg:text-7xl">
          {lecture.title}
        </h1>
      </header>

      <section className="mx-auto w-full max-w-4xl">
        <p className="section-kicker mb-3">The lead insight</p>
        <InsightCard
          insight={lecture.leadInsight}
          week={lecture.week}
          lead
          comments={commentsByItem.get(lecture.leadInsight.id) ?? []}
          signedIn={signedIn}
        />
      </section>

      {lecture.offSlides.length > 0 && (
        <section className="mx-auto flex w-full max-w-4xl flex-col gap-5">
          <div className="rule-heading flex items-baseline justify-between">
            <h2 className="font-editorial text-3xl font-bold">Off the slides</h2>
            <span className="section-kicker hidden sm:block">What you heard in the room</span>
          </div>
          {lecture.offSlides.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              week={lecture.week}
              comments={commentsByItem.get(insight.id) ?? []}
              signedIn={signedIn}
            />
          ))}
        </section>
      )}

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="rule-heading flex items-baseline justify-between">
          <h2 className="font-editorial text-3xl font-bold">Build this</h2>
          <span className="section-kicker hidden sm:block">Put the lecture to work</span>
        </div>
        <SideProjectsLabel />
        {lecture.buildIdeas.length === 0 ? (
          <p className="text-sm text-zinc-500">No build ideas for this one — not every talk warrants one.</p>
        ) : (
          lecture.buildIdeas.map((idea) => (
            <BuildIdeaCard
              key={idea.id}
              idea={idea}
              week={lecture.week}
              comments={commentsByItem.get(idea.id) ?? []}
              signedIn={signedIn}
            />
          ))
        )}
      </section>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="rule-heading flex items-baseline justify-between">
          <h2 className="font-editorial text-3xl font-bold">Prompts to try</h2>
          <span className="section-kicker hidden sm:block">Ready to use</span>
        </div>
        <SideProjectsLabel />
        {lecture.agentPrompts.length === 0 ? (
          <p className="text-sm text-zinc-500">No tested prompts for this one yet.</p>
        ) : (
          lecture.agentPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              week={lecture.week}
              comments={commentsByItem.get(prompt.id) ?? []}
              signedIn={signedIn}
            />
          ))
        )}
      </section>

      {lecture.callbacks.length > 0 && (
        <section className="rule-heading mx-auto flex w-full max-w-4xl flex-col gap-3">
          <h2 className="font-editorial text-2xl font-bold">Callbacks</h2>
          <ul className="flex flex-col gap-1 text-sm text-zinc-700">
            {lecture.callbacks.map((cb, i) => (
              <li key={i}>
                <span className="text-zinc-500">Week {cb.to_week}:</span> {cb.note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lecture.glossary.length > 0 && (
        <section className="rule-heading mx-auto flex w-full max-w-4xl flex-col gap-3">
          <h2 className="font-editorial text-2xl font-bold">Glossary</h2>
          <dl className="flex flex-col gap-2 text-sm">
            {lecture.glossary.map((g, i) => (
              <div key={i}>
                <dt className="font-medium">{g.term}</dt>
                <dd className="text-zinc-600">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {lecture.announcements.length > 0 && (
        <section className="rule-heading mx-auto flex w-full max-w-4xl flex-col gap-3">
          <h2 className="font-editorial text-2xl font-bold">Announcements</h2>
          <ul className="flex flex-col gap-1 text-sm text-zinc-700">
            {lecture.announcements.map((a, i) => (
              <li key={i}>{a.text}</li>
            ))}
          </ul>
        </section>
      )}

      {lecture.onSlides.length > 0 && (
        <details className="rule-heading mx-auto w-full max-w-4xl">
          <summary className="font-editorial cursor-pointer text-2xl font-bold">On the slides</summary>
          <div className="flex flex-col gap-4 pt-4">
            {lecture.onSlides.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                week={lecture.week}
                comments={commentsByItem.get(insight.id) ?? []}
                signedIn={signedIn}
              />
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
