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
    <main className="page-shell flex flex-1 flex-col gap-7 py-12 sm:py-16">
      <header className="border-b border-black pb-6">
        <p className="section-kicker mb-3">Ideas worth making</p>
        <h1 className="font-editorial text-5xl font-bold sm:text-6xl">Build</h1>
      </header>
      <SideProjectsLabel />
      <nav className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-[0.1em]">
        <Link href="/build" className={`border px-3 py-1.5 ${!effort ? "border-black bg-black text-white" : "border-[#81796d] text-[#5f5a52]"}`}>
          All
        </Link>
        {EFFORTS.map((e) => (
          <Link
            key={e}
            href={`/build?effort=${e}`}
            className={`border px-3 py-1.5 ${effort === e ? "border-black bg-black text-white" : "border-[#81796d] text-[#5f5a52]"}`}
          >
            {e}
          </Link>
        ))}
      </nav>
      {filtered.length === 0 ? (
        <p className="text-zinc-600">Nothing here yet.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filtered.map(({ week, idea }) => (
            <div key={idea.id} className="flex flex-col gap-2">
              <BuildIdeaCard idea={idea} week={week} />
              <Link href={`/w/${week}`} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#6f6a61]">
                from week {week}
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
