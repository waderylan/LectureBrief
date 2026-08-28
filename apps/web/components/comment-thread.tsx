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
    <div className="mt-2 flex flex-col gap-3 border-t border-[#c9c1b4] pt-4">
      {optimisticComments.map((c) => (
        <div key={c.id} className="border-l border-[#c9c1b4] pl-3 text-sm">
          <span className="font-medium">{c.authorEmail}</span>{" "}
          <span className="text-xs text-[#6f6a61]">{new Date(c.createdAt).toLocaleString()}</span>
          <p className="text-[#413d37]">{c.body}</p>
        </div>
      ))}
      {signedIn ? (
        <form ref={formRef} action={submit} className="flex flex-col gap-2 sm:flex-row">
          <input
            name="body"
            required
            placeholder="Add a comment"
            className="min-w-0 flex-1 border border-[#a9a094] bg-[#fbf8f1] px-3 py-2 text-sm outline-none focus:border-black"
          />
          <button type="submit" disabled={pending} className="border border-black bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white disabled:opacity-50">
            {pending ? "Posting…" : "Post"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-[#6f6a61]">
          <Link href="/signin" className="font-semibold underline">
            Sign in
          </Link>{" "}
          to comment.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
