import type { Metadata } from "next";
import Link from "next/link";
import { getAllAgentPrompts } from "@/lib/lectures";
import { PromptCard } from "@/components/prompt-card";
import { SideProjectsLabel } from "@/components/side-projects-label";

export const metadata: Metadata = {
  title: "Prompts",
  robots: { index: false, follow: false },
};

export default async function PromptsPage() {
  const prompts = await getAllAgentPrompts();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Prompts</h1>
      <SideProjectsLabel />
      {prompts.length === 0 ? (
        <p className="text-zinc-600">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {prompts.map(({ week, prompt }) => (
            <div key={prompt.id} className="flex flex-col gap-1">
              <PromptCard prompt={prompt} week={week} />
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
