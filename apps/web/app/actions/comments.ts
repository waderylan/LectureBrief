"use server";

import { db, schema } from "@lecturebrief/db";
import { auth } from "@/auth";

export interface CommentView {
  id: string;
  body: string;
  authorEmail: string;
  createdAt: string;
}

const MAX_COMMENT_LENGTH = 2000;

/**
 * Signed-in users only (BUILD_PLAN.md Day 5) — enforced here, at the write
 * boundary, not just hidden client-side. `itemId` FKs to `items.id`; there is
 * no weekly-thread concept anywhere in this schema on purpose.
 */
export async function postComment(itemId: string, body: string): Promise<CommentView> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("You must be signed in to comment.");
  }

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Comment cannot be empty.");
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`Comment is too long (max ${MAX_COMMENT_LENGTH} characters).`);
  }

  const [row] = await db
    .insert(schema.comments)
    .values({ itemId, userId: session.user.id, body: trimmed })
    .returning();
  if (!row) throw new Error("Failed to save comment.");

  return {
    id: row.id,
    body: row.body,
    authorEmail: session.user.email ?? "unknown",
    createdAt: row.createdAt.toISOString(),
  };
}
