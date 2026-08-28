import type { Metadata } from "next";
import Link from "next/link";
import { getLatestLecture } from "@/lib/lectures";
import { LecturePage } from "@/components/lecture-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Home() {
  const lecture = await getLatestLecture();

  if (!lecture) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">No lecture published yet</h1>
        <p className="text-zinc-600">Check back once the first one is approved and published.</p>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <LecturePage lecture={lecture} />
      <div className="mx-auto flex w-full max-w-3xl justify-end px-6 pb-12">
        <Link href="/archive" className="text-sm underline text-zinc-600">
          See all past lectures &rarr;
        </Link>
      </div>
    </main>
  );
}
