/**
 * The data contract between pipeline and site. ARCHITECTURE.md §9, frozen here
 * per BUILD_PLAN.md Day 3. Both sides import from here and nowhere else.
 *
 * Deltas from the ARCHITECTURE.md §9 listing (see BUILD_PLAN.md §1):
 * - No `course` field. The source material is public conference talks, not a
 *   university course, and nothing in the product names one.
 * - `week` is kept as the ordinal position of a talk in the release sequence
 *   (matches the CLI's `<week>` argument and `content/lecture-NN.json`
 *   naming) — a sequence number, not a calendar week of a real course.
 *
 * After this freeze, every further change needs a stated reason — see the
 * `schema-edit` skill.
 */

import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

const SlideRelation = z.enum(["on_slides", "elaborates_slide", "off_slides"]);
const Stance = z.enum(["asserted", "speculated", "attributed", "opinion"]);
const Speaker = z.enum(["instructor", "student", "unclear"]);
const Verification = z.enum(["supported", "partially_supported"]);
const Effort = z.enum(["afternoon", "weekend", "multi_week"]);
const Status = z.enum(["draft", "approved"]);

/** Grounding fields — never optional. See ARCHITECTURE.md §5. */
const Origin = z
  .object({
    evidence: z.string().min(1),
    timestamp: z.number(),
  })
  .strict();
export type Origin = z.infer<typeof Origin>;

export const Insight = z
  .object({
    id: z.string().min(1),
    claim: z.string().min(1),
    context: z.string(),
    /** VERBATIM transcript span. */
    evidence: z.string().min(1),
    timestamp: z.number(),
    slide_relation: SlideRelation,
    stance: Stance,
    speaker: Speaker,
    verification: Verification,
    tags: z.array(z.string()),
    redacted: z.boolean(),
  })
  .strict();
export type Insight = z.infer<typeof Insight>;

export const BuildIdea = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    pitch: z.string().min(1),
    effort: Effort,
    you_will_learn: z.string().min(1),
    stack_hint: z.array(z.string()),
    origin: Origin,
    redacted: z.boolean(),
  })
  .strict();
export type BuildIdea = z.infer<typeof BuildIdea>;

export const AgentPrompt = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    what_it_does: z.string().min(1),
    prompt: z.string().min(1),
    prerequisites: z.array(z.string()),
    origin: Origin,
    /** Publication gate — see ARCHITECTURE.md §6.2. `false` never publishes. */
    tested: z.boolean(),
    redacted: z.boolean(),
  })
  .strict();
export type AgentPrompt = z.infer<typeof AgentPrompt>;

const Callback = z
  .object({
    to_week: z.number(),
    note: z.string().min(1),
    timestamp: z.number(),
  })
  .strict();

const GlossaryEntry = z
  .object({
    term: z.string().min(1),
    definition: z.string().min(1),
    timestamp: z.number(),
  })
  .strict();

const Announcement = z
  .object({
    text: z.string().min(1),
    timestamp: z.number(),
  })
  .strict();

const CorrectionLogEntry = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    timestamp: z.number(),
  })
  .strict();

export const LectureDocument = z
  .object({
    schema_version: z.literal(SCHEMA_VERSION),
    week: z.number(),
    date: z.string(),
    /** Human-written, not model-generated. */
    title: z.string().min(1),
    status: Status,
    prompt_version: z.string().min(1),
    generated_at: z.string(),

    lead_insight: Insight,
    insights: z.array(Insight),
    build_ideas: z.array(BuildIdea),
    agent_prompts: z.array(AgentPrompt),

    callbacks: z.array(Callback),
    glossary: z.array(GlossaryEntry),
    announcements: z.array(Announcement),
    open_questions: z.array(z.string()),

    corrections_log: z.array(CorrectionLogEntry),
  })
  .strict();
export type LectureDocument = z.infer<typeof LectureDocument>;
