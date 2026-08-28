import type { Metadata } from "next";
import Link from "next/link";
import { getAllBuildIdeas } from "@/lib/lectures";
import { BuildIdeaCard } from "@/components/build-idea-card";
import { SideProjectsLabel } from "@/components/side-projects-label";
import type { BuildIdea } from "@lecturebrief/schema";

export const metadata: Metadata = {
  title: "Build",
  robots: { index: false, follow: false },
};

const EFFORTS: BuildIdea["effort"][] = ["afternoon", "weekend", "multi_week"];

export default async function BuildPage({ searchParams }: PageProps<"/build">) {
  const { effort: effortParam } = await searchParams;
  const effort = typeof effortParam === "string" ? effortParam : undefined;

  const all = await getAllBuildIdeas();
  const filtered = effort ? all.filter((b) => b.idea.effort === effort) : all;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Build</h1>
      <SideProjectsLabel />
      <nav className="flex gap-3 text-sm">
        <Link href="/build" className={!effort ? "font-semibold underline" : "underline text-zinc-600"}>
          All
        </Link>
        {EFFORTS.map((e) => (
          <Link
            key={e}
            href={`/build?effort=${e}`}
            className={effort === e ? "font-semibold underline" : "underline text-zinc-600"}
          >
            {e}
          </Link>
        ))}
      </nav>
      {filtered.length === 0 ? (
        <p className="text-zinc-600">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(({ week, idea }) => (
            <div key={idea.id} className="flex flex-col gap-1">
              <BuildIdeaCard idea={idea} week={week} />
              <Link href={`/w/${week}`} className="text-xs text-zinc-500 underline">
                from week {week}
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
