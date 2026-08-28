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
      <main className="page-shell flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="section-kicker">Latest edition</p>
        <h1 className="font-editorial text-4xl font-bold">No lecture published yet</h1>
        <p className="text-[#6f6a61]">Check back once the first one is approved and published.</p>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <LecturePage lecture={lecture} />
      <div className="page-shell flex justify-end pb-14">
        <Link href="/archive" className="border-b border-black pb-1 text-xs font-bold uppercase tracking-[0.12em]">
          See all past lectures &rarr;
        </Link>
      </div>
    </main>
  );
}
