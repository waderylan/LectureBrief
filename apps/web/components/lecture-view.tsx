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
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-zinc-500">
          Week {lecture.week} &middot; {lecture.date}
        </p>
        <h1 className="text-3xl font-bold">{lecture.title}</h1>
      </header>

      <section>
        <InsightCard
          insight={lecture.leadInsight}
          week={lecture.week}
          lead
          comments={commentsByItem.get(lecture.leadInsight.id) ?? []}
          signedIn={signedIn}
        />
      </section>

      {lecture.offSlides.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Off the slides</h2>
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

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Build this</h2>
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

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Prompts to try</h2>
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
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Callbacks</h2>
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
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Glossary</h2>
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
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Announcements</h2>
          <ul className="flex flex-col gap-1 text-sm text-zinc-700">
            {lecture.announcements.map((a, i) => (
              <li key={i}>{a.text}</li>
            ))}
          </ul>
        </section>
      )}

      {lecture.onSlides.length > 0 && (
        <details className="flex flex-col gap-4">
          <summary className="cursor-pointer text-xl font-semibold">On the slides</summary>
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
