import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLectureByWeek } from "@/lib/lectures";
import { LecturePage } from "@/components/lecture-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function WeekPage({ params }: PageProps<"/w/[week]">) {
  const { week: weekParam } = await params;
  const week = Number(weekParam);
  if (!Number.isInteger(week)) notFound();

  const lecture = await getLectureByWeek(week);
  if (!lecture) notFound();

  return (
    <main className="flex-1">
      <LecturePage lecture={lecture} />
    </main>
  );
}
