---
name: web-route
description: Add one Next.js route or component to apps/web — a lecture page, /build, /prompts, /archive, auth pages, or the comment thread. Trigger on "build the lecture page", "add the /build route", "wire up comments", "add sign-in".
---

# Web route

One route per invocation. Reads come from Postgres via Drizzle in server components; writes go through server actions.

## The routes

| Route | Contents |
|---|---|
| `/` | Latest lecture, rendered in full |
| `/w/[week]` | One lecture |
| `/w/[week]#[id]` | Deep link to a single insight, build idea, or prompt |
| `/archive` | All lectures with dek lines |
| `/build` | Every build idea, all weeks, filterable by effort |
| `/prompts` | Every prompt, all weeks |
| `/t/[tag]` | Insights by tag — first thing to cut if the week gets tight |

`/build` and `/prompts` exist because the applied content outlives the recaps, and they're what people link to from outside the class.

## Lecture page order — fixed

1. Week, date, title
2. **Lead insight**, more visual weight than anything else on the page
3. **Off the slides** — `off_slides` and `elaborates_slide` together, each a self-contained card with claim, context, evidence excerpt, timestamp, stance marker
4. **Build this** — effort labels visible before the reader commits attention
5. **Prompts to try** — prerequisites stated *above* the prompt body, not below
6. Callbacks
7. Glossary
8. Announcements
9. **On the slides** — `on_slides` only, collapsed by default

Sections 3–5 above 9, with 9 collapsed, is the design. Do not merge it chronologically.

## Requirements on every page that renders applied content

- The standing label — *Side projects for extended learning. Not for coursework or assignments.* — renders on the build and prompt sections, on `/build`, on `/prompts`, and when someone lands on a deep link to a single item. Part of the section chrome, always rendered, never behind a flag.
- Copy-link on every insight, build idea, and prompt.
- Copy-text on every prompt body — the prompt alone, clean, no surrounding markup. **Test it on mobile.** It's the most-used control on the site.
- `stance` is visually distinguishable. An opinion and a stated fact must not look identical.
- `partially_supported` insights render with a visible hedge.
- `noindex` in the metadata.

## Auth and comments

- Auth.js v5, credentials provider, bcrypt, JWT session.
- Anyone can read. Only signed-in users can comment.
- Comments anchor to a **specific item id**, never to a weekly thread. A disagreement under the claim it's about is a conversation; the same text in a week-four thread is noise.
- Server action for posting, optimistic render.

## Rule

The site is the disposable half of this project. Do not spend Day 5 on animation. It needs to be correct — right IA, working copy buttons, labels present — and can be ugly until Day 7.
