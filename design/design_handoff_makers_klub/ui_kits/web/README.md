# Makers Klub — Web UI Kit

The member web app (sign-in side of `makersklub.com`). Five screens, one shell.

## Screens (sidebar nav)
| # | Screen | Purpose |
|---|---|---|
| 01 | **Home** | Welcome back. Hero match card + stats (sessions, people met, follow-ups owed) + this month's group preview + sidebar with upcoming session, follow-ups, memory teaser. |
| 02 | **Match reveal** | Two founders, two creatives. Full bios, "looking for / open to" tags, session count badges. The pre-session moment. |
| 03 | **Session** | Hero with date + venue, info tiles, agenda timeline (active highlight), who's coming, "need to know" checklist. |
| 04 | **Memory** | Past people, grouped by month. Each card has avatar + role + italic Fraunces quote on cream-2 + ochre follow-up flag. |
| 05 | **Events** | Three event cards with colored hero zones (ochre, lavender, navy), date stamps, going-stack, RSVP CTA. |

## Layout
- App shell: **248px sidebar + 1fr main**, max-width 1440px centered.
- Sidebar: brand mark + nav (active = navy fill, ochre icon) + user footer.
- Main: 28/36px gutters, every screen leads with a `.mkw-pagehead` block.

## System rules (web)
- Cards: white on cream, `1px var(--border-1)`, `14–16px` radius, `22px` padding.
- Hero blocks: full navy with radial ochre/lavender glow, large Fraunces 800 title with italic lavender `<em>` accent.
- Stats: cream-bg tiles with display-font number.
- Memory: italic Fraunces quote on cream-2 with **ochre left-border** — same pattern as mobile, scaled up.
- All buttons use shared `.mk-btn` classes from `colors_and_type.css`.

Run `index.html` and click the sidebar to switch screens.
