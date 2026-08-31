import type { Metadata } from "next";
import Link from "next/link";
import { getAllAgentPrompts } from "@/lib/lectures";
import { PromptCard } from "@/components/prompt-card";
import { SideProjectsLabel } from "@/components/side-projects-label";
import { commentsEnabled } from "@/lib/runtime";

export const metadata: Metadata = {
  title: "Prompts",
  robots: { index: false, follow: false },
};

export default async function PromptsPage() {
  const prompts = await getAllAgentPrompts();

  return (
    <main className="page-shell flex flex-1 flex-col gap-7 py-12 sm:py-16">
      <header className="border-b border-black pb-6">
        <p className="section-kicker mb-3">Ready to run</p>
        <h1 className="font-editorial text-5xl font-bold sm:text-6xl">Prompts</h1>
      </header>
      <SideProjectsLabel />
      {prompts.length === 0 ? (
        <p className="text-zinc-600">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {prompts.map(({ week, prompt }) => (
            <div key={prompt.id} className="flex flex-col gap-2">
              <PromptCard prompt={prompt} week={week} commentsEnabled={commentsEnabled} />
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
