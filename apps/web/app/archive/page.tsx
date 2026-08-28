import type { Metadata } from "next";
import Link from "next/link";
import { getArchive } from "@/lib/lectures";

export const metadata: Metadata = {
  title: "Archive",
  robots: { index: false, follow: false },
};

export default async function ArchivePage() {
  const entries = await getArchive();

  return (
    <main className="page-shell flex flex-1 flex-col gap-8 py-12 sm:py-16">
      <header className="border-b border-black pb-6">
        <p className="section-kicker mb-3">Every edition</p>
        <h1 className="font-editorial text-5xl font-bold sm:text-6xl">Archive</h1>
      </header>
      {entries.length === 0 ? (
        <p className="text-zinc-600">Nothing published yet.</p>
      ) : (
        <ul className="grid gap-px border border-[#c9c1b4] bg-[#c9c1b4] md:grid-cols-2">
          {entries.map((e) => (
            <li key={e.week} className="flex flex-col gap-3 bg-[#f5f0e7] p-6 transition-colors hover:bg-[#fbf8f1] sm:p-8">
              <p className="section-kicker">{e.date}</p>
              <Link href={`/w/${e.week}`} className="font-editorial text-2xl font-bold leading-tight sm:text-3xl">
                Week {e.week}: {e.title}
              </Link>
              {e.dek && <p className="text-sm leading-6 text-[#5f5a52]">{e.dek}</p>}
              <Link href={`/w/${e.week}`} className="mt-auto pt-3 text-xs font-bold uppercase tracking-[0.12em]">
                Read edition &rarr;
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
