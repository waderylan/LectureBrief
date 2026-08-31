/**
 * Read path for published content. Postgres remains the interactive source
 * of truth. Read-only deployments use the committed canonical documents and
 * reapply the publication filters before rendering.
 */

import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@lecturebrief/db";
import type { CommentView } from "@/app/actions/comments";
import {
  Insight,
  BuildIdea,
  AgentPrompt,
  LectureDocument,
  type LectureDocument as LectureDocumentType,
} from "@lecturebrief/schema";
import lecture01 from "../../../content/lecture-01.json";
import lecture02 from "../../../content/lecture-02.json";
import lecture03 from "../../../content/lecture-03.json";
import { usesCanonicalContent } from "./runtime";

/** Use approved canonical files for a read-only deployment without hosted Postgres. */
const canonicalLectures = [lecture01, lecture02, lecture03]
  .map((document) => LectureDocument.parse(document))
  .filter((document) => document.status === "approved")
  .sort((a, b) => b.week - a.week);

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

function canonicalToView(document: LectureDocumentType): LectureView {
  const visibleInsights = [document.lead_insight, ...document.insights].filter((item) => !item.redacted);

  return {
    week: document.week,
    date: document.date,
    title: document.title,
    leadInsight: document.lead_insight,
    offSlides: visibleInsights.filter(
      (item) => item.id !== document.lead_insight.id && item.slide_relation !== "on_slides",
    ),
    onSlides: visibleInsights.filter(
      (item) => item.id !== document.lead_insight.id && item.slide_relation === "on_slides",
    ),
    buildIdeas: document.build_ideas.filter((item) => !item.redacted),
    agentPrompts: document.agent_prompts.filter((item) => !item.redacted && item.tested),
    callbacks: document.callbacks,
    glossary: document.glossary,
    announcements: document.announcements,
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
  if (usesCanonicalContent) {
    const document = canonicalLectures.find((lecture) => lecture.week === week);
    return document ? canonicalToView(document) : null;
  }
  return loadLecture(week);
}

export async function getLatestLecture(): Promise<LectureView | null> {
  if (usesCanonicalContent) {
    const document = canonicalLectures[0];
    return document ? canonicalToView(document) : null;
  }
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
  if (usesCanonicalContent) {
    return canonicalLectures.map((lecture) => ({
      week: lecture.week,
      date: lecture.date,
      title: lecture.title,
      dek: lecture.lead_insight.claim,
    }));
  }
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
  if (usesCanonicalContent) {
    return canonicalLectures.flatMap((lecture) =>
      lecture.build_ideas
        .filter((idea) => !idea.redacted)
        .map((idea) => ({ week: lecture.week, idea })),
    );
  }
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
  if (usesCanonicalContent) {
    return canonicalLectures.flatMap((lecture) =>
      lecture.agent_prompts
        .filter((prompt) => !prompt.redacted && prompt.tested)
        .map((prompt) => ({ week: lecture.week, prompt })),
    );
  }
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
  if (usesCanonicalContent || itemIds.length === 0) return map;

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
