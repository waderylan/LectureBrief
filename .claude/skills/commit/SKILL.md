---
name: commit
description: Stage, commit, and push the current work on LectureBrief. Trigger on "commit this", "commit and push", "save progress", or at the end of a next-task item.
---

# Commit

## Steps

1. `git status --short` and `git diff` to see what's actually changed.
2. Stage the files belonging to this unit of work. Prefer naming paths over `git add -A` — a stray `.env` or a cache directory in a commit is annoying to undo.
3. Commit with a message that says what changed and why:

   ```
   <short imperative subject>

   <what changed, and the reason it changed — not a file list, git already has that>
   ```

4. `git push` if a remote is configured. There is no remote yet — until one is added, commit and say so rather than reporting a push that didn't happen.

## Rules

- One checklist item per commit. Commits map onto `BUILD_PLAN.md` items, which makes it obvious what's done and easy to revert one decision without unpicking three.
- If `BUILD_PLAN.md` boxes were ticked for this work, include that edit in the same commit.
- Never commit `.env`, `.cache/`, `node_modules/`, `.next/`, or audio files. `.gitignore` covers these; if something slips through, fix the ignore file rather than committing it.
- Never `--no-verify`. If a hook fails, fix the cause.
- No `Co-Authored-By: Claude` or `Claude-Session` trailers, and no mention of AI generation in commit messages or PR descriptions.
- Don't amend a pushed commit.
- `/content/*.json` is canonical and **is** committed — that's the version history behind review traceability. Transcripts and audio in `.cache/` are not.
