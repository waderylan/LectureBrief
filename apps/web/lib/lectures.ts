/**
 * Read path for published content. Reads only from Postgres — never
 * `content/*.json` directly — because a lecture/item row's presence there is
 * itself the "approved, not redacted/untested" claim (see `packages/db`'s
 * schema header and `publish.ts`). Everything here is server-only.
 */

import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@lecturebrief/db";
import type { CommentView } from "@/app/actions/comments";
import { Insight, BuildIdea, AgentPrompt } from "@lecturebrief/schema";

export interface LectureView {
  week: number;
  date: string;
  title: string;
  leadInsight: Insight;
  /** `elaborates_slide` and `off_slides`, in extraction order — ARCHITECTURE.md §10 §3. */
  offSlides: Insight[];
  /** `on_slides` only, collapsed by default — §10 §9. */
  onSlides: Insight[];
  buildIdeas: BuildIdea[];
  agentPrompts: AgentPrompt[];
  callbacks: (typeof schema.lectures.$inferSelect)["callbacks"];
  glossary: (typeof schema.lectures.$inferSelect)["glossary"];
  announcements: (typeof schema.lectures.$inferSelect)["announcements"];
}

function toView(
  lecture: typeof schema.lectures.$inferSelect,
  itemRows: (typeof schema.items.$inferSelect)[],
): LectureView {
  let leadInsight: Insight | null = null;
  const restInsights: Insight[] = [];
  const buildIdeas: BuildIdea[] = [];
  const agentPrompts: AgentPrompt[] = [];

  for (const row of itemRows) {
    if (row.kind === "insight") {
      const insight = Insight.parse(row.data);
      if (row.isLead) leadInsight = insight;
      else restInsights.push(insight);
    } else if (row.kind === "build_idea") {
      buildIdeas.push(BuildIdea.parse(row.data));
    } else {
      agentPrompts.push(AgentPrompt.parse(row.data));
    }
  }

  if (!leadInsight) {
    throw new Error(`lecture ${lecture.week}: no lead insight row in the database — publish is broken`);
  }

  return {
    week: lecture.week,
    date: lecture.date,
    title: lecture.title,
    leadInsight,
    offSlides: restInsights.filter((i) => i.slide_relation !== "on_slides"),
    onSlides: restInsights.filter((i) => i.slide_relation === "on_slides"),
    buildIdeas,
    agentPrompts,
    callbacks: lecture.callbacks,
    glossary: lecture.glossary,
    announcements: lecture.announcements,
  };
}

async function loadLecture(week: number): Promise<LectureView | null> {
  const [lecture] = await db.select().from(schema.lectures).where(eq(schema.lectures.week, week));
  if (!lecture) return null;

  const itemRows = await db
    .select()
    .from(schema.items)
    .where(eq(schema.items.lectureWeek, week))
    .orderBy(schema.items.kind, schema.items.orderIndex);

  return toView(lecture, itemRows);
}

export async function getLectureByWeek(week: number): Promise<LectureView | null> {
  return loadLecture(week);
}

export async function getLatestLecture(): Promise<LectureView | null> {
  const [row] = await db
    .select({ week: schema.lectures.week })
    .from(schema.lectures)
    .orderBy(desc(schema.lectures.week))
    .limit(1);
  if (!row) return null;
  return loadLecture(row.week);
}

export interface ArchiveEntry {
  week: number;
  date: string;
  title: string;
  /** The lead insight's claim, as the dek line — ARCHITECTURE.md §10. */
  dek: string;
}

export async function getArchive(): Promise<ArchiveEntry[]> {
  const lectures = await db
    .select({ week: schema.lectures.week, date: schema.lectures.date, title: schema.lectures.title })
    .from(schema.lectures)
    .orderBy(desc(schema.lectures.week));

  const leadRows = await db
    .select({ lectureWeek: schema.items.lectureWeek, data: schema.items.data })
    .from(schema.items)
    .where(and(eq(schema.items.kind, "insight"), eq(schema.items.isLead, true)));
  const dekByWeek = new Map(leadRows.map((r) => [r.lectureWeek, Insight.parse(r.data).claim]));

  return lectures.map((l) => ({
    week: l.week,
    date: l.date,
    title: l.title,
    dek: dekByWeek.get(l.week) ?? "",
  }));
}

export interface BuildIdeaWithWeek {
  week: number;
  idea: BuildIdea;
}

export async function getAllBuildIdeas(): Promise<BuildIdeaWithWeek[]> {
  const rows = await db
    .select({ week: schema.items.lectureWeek, data: schema.items.data })
    .from(schema.items)
    .where(eq(schema.items.kind, "build_idea"))
    .orderBy(desc(schema.items.lectureWeek), schema.items.orderIndex);
  return rows.map((r) => ({ week: r.week, idea: BuildIdea.parse(r.data) }));
}

export interface AgentPromptWithWeek {
  week: number;
  prompt: AgentPrompt;
}

export async function getAllAgentPrompts(): Promise<AgentPromptWithWeek[]> {
  const rows = await db
    .select({ week: schema.items.lectureWeek, data: schema.items.data })
    .from(schema.items)
    .where(eq(schema.items.kind, "agent_prompt"))
    .orderBy(desc(schema.items.lectureWeek), schema.items.orderIndex);
  return rows.map((r) => ({ week: r.week, prompt: AgentPrompt.parse(r.data) }));
}

/** Comments anchored to a specific item id — ARCHITECTURE.md §14's planned direction, brought forward. */
export async function getCommentsForItems(itemIds: string[]): Promise<Map<string, CommentView[]>> {
  const map = new Map<string, CommentView[]>();
  if (itemIds.length === 0) return map;

  const rows = await db
    .select({
      id: schema.comments.id,
      itemId: schema.comments.itemId,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      authorEmail: schema.users.email,
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.comments.userId, schema.users.id))
    .where(inArray(schema.comments.itemId, itemIds))
    .orderBy(schema.comments.createdAt);

  for (const r of rows) {
    const list = map.get(r.itemId) ?? [];
    list.push({ id: r.id, body: r.body, authorEmail: r.authorEmail, createdAt: r.createdAt.toISOString() });
    map.set(r.itemId, list);
  }
  return map;
}
