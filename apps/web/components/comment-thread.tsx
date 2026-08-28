"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { postComment, type CommentView } from "@/app/actions/comments";

/**
 * One thread per item id (BUILD_PLAN.md Day 5) — never a weekly thread.
 * Optimistic render: the comment appears immediately on submit, then gets
 * reconciled with the real row (real id, real timestamp) once the server
 * action returns.
 */
export function CommentThread({
  itemId,
  initialComments,
  signedIn,
}: {
  itemId: string;
  initialComments: CommentView[];
  signedIn: boolean;
}) {
  const [comments, setComments] = useState(initialComments);
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (state: CommentView[], next: CommentView) => [...state, next],
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (!body) return;

    startTransition(async () => {
      setError(null);
      addOptimistic({
        id: `pending-${Date.now()}`,
        body,
        authorEmail: "you",
        createdAt: new Date().toISOString(),
      });
      try {
        const saved = await postComment(itemId, body);
        setComments((prev) => [...prev, saved]);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to post comment.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-2 mt-1">
      {optimisticComments.map((c) => (
        <div key={c.id} className="text-sm">
          <span className="font-medium">{c.authorEmail}</span>{" "}
          <span className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleString()}</span>
          <p className="text-zinc-700">{c.body}</p>
        </div>
      ))}
      {signedIn ? (
        <form ref={formRef} action={submit} className="flex gap-2">
          <input
            name="body"
            required
            placeholder="Add a comment"
            className="flex-1 rounded border px-2 py-1 text-sm"
          />
          <button type="submit" disabled={pending} className="text-sm underline disabled:opacity-50">
            {pending ? "Posting…" : "Post"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-zinc-500">
          <Link href="/signin" className="underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
