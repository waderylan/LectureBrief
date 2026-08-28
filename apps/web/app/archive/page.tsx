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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Archive</h1>
      {entries.length === 0 ? (
        <p className="text-zinc-600">Nothing published yet.</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {entries.map((e) => (
            <li key={e.week} className="flex flex-col gap-1">
              <Link href={`/w/${e.week}`} className="text-lg font-medium underline">
                Week {e.week}: {e.title}
              </Link>
              <p className="text-sm text-zinc-500">{e.date}</p>
              {e.dek && <p className="text-sm text-zinc-700">{e.dek}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
