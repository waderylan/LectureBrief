/**
 * Drizzle schema for the Postgres side of AD-6 (amended, BUILD_PLAN.md §1):
 * lecture JSON stays canonical in git; `brief publish` upserts it here.
 * Users and comments live only in Postgres — nothing about them is derived
 * from git.
 *
 * `lectures` and `items` rows only ever exist for content that has already
 * passed the publish gates (ARCHITECTURE.md AD-7): a row's presence in this
 * database *is* the "approved and not redacted/untested" claim, so neither
 * table carries its own `status`/`redacted`/`tested` column. `content/lecture-NN.json`
 * remains the record of what those flags were at publish time.
 */

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  Announcement,
  Callback,
  GlossaryEntry,
  Insight,
  BuildIdea,
  AgentPrompt,
} from "@lecturebrief/schema";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const itemKind = pgEnum("item_kind", ["insight", "build_idea", "agent_prompt"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailUnique: uniqueIndex("users_email_unique").on(t.email),
}));
export type User = typeof users.$inferSelect;

export const lectures = pgTable("lectures", {
  // The talk's release-sequence number (config.ts `TALK_WEEKS`), matching
  // `content/lecture-NN.json` naming. Not a calendar week — see the schema
  // package's header comment.
  week: integer("week").primaryKey(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  promptVersion: text("prompt_version").notNull(),
  generatedAt: text("generated_at").notNull(),
  // Lecture-level chrome (ARCHITECTURE.md §10 IA: callbacks, glossary,
  // announcements sit below the applied sections; open_questions isn't
  // rendered by §10 but travels with the rest of the document regardless).
  // None of these are ever commented on, so — unlike insights/build_ideas/
  // agent_prompts — they don't need their own `items` rows; storing them
  // as arrays here keeps the site's read path Postgres-only rather than
  // mixing in a read from the git-committed JSON at request time.
  callbacks: jsonb("callbacks").notNull().$type<Callback[]>(),
  glossary: jsonb("glossary").notNull().$type<GlossaryEntry[]>(),
  announcements: jsonb("announcements").notNull().$type<Announcement[]>(),
  openQuestions: jsonb("open_questions").notNull().$type<string[]>(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Lecture = typeof lectures.$inferSelect;

export const items = pgTable("items", {
  // The persisted slug from `@lecturebrief/schema` (`insight-...`,
  // `build-...`, `prompt-...`). Comments FK to this, so its stability across
  // republishes (ARCHITECTURE.md §9) is a data-integrity requirement, not
  // just link hygiene.
  id: text("id").primaryKey(),
  lectureWeek: integer("lecture_week")
    .notNull()
    .references(() => lectures.week, { onDelete: "cascade" }),
  kind: itemKind("kind").notNull(),
  // True for exactly one insight per lecture — the `lead_insight`. Kept as a
  // column rather than inferred so a page render doesn't have to special-case
  // "first insight" vs. "the field that was actually promoted at verify/extract".
  isLead: boolean("is_lead").notNull().default(false),
  // Position within its own kind, in the order `content/lecture-NN.json`
  // carries it — the narrative order the extraction pass produced.
  orderIndex: integer("order_index").notNull(),
  // The full Insight | BuildIdea | AgentPrompt object, validated against
  // `@lecturebrief/schema` before insert. Shape varies by `kind`; the reader
  // re-parses with the matching schema.
  data: jsonb("data").notNull().$type<Insight | BuildIdea | AgentPrompt>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export type ItemRow = typeof items.$inferSelect;

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: text("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type Comment = typeof comments.$inferSelect;
