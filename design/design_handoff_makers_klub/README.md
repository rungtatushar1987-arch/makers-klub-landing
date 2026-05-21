# Handoff: Makers Klub — Full Design System

## Overview

Makers Klub is a Berlin-based, invite-only community that matches founders with creative freelancers for monthly in-person co-working sessions. This handoff covers the **entire product surface**:

1. **Marketing landing page** — cold-traffic site (`makersklub.com`) for the waitlist
2. **Member web dashboard** — desktop app after sign-in
3. **Member mobile app** — iOS / Android (5 screens + splash + 3 loaders)
4. **Foundations** — colors, typography, components, copy voice — all shared

The mobile app and web dashboard cover identical product moments (home, match reveal, session, memory, brief), reskinned for each form factor.

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**. They demonstrate the visual system (colors, typography, spacing, components, copy voice) and the user-facing structure of each screen.

Your task is to **recreate these designs in the target codebase's environment** using its established patterns:

- The existing **landing page repo** (`makers-klub-landing`) is vanilla HTML/CSS/JS deployed to Vercel — the design here can be ported almost directly.
- The existing **members app repo** (`mk-event-app`) is **React 18 + Vite + TypeScript + Clerk + CSS Modules**. The mobile-app and web-dashboard designs should be implemented there as new pages/components following the existing CSS Module conventions.

Do not copy the HTML wholesale. **Re-implement** in the target framework, using the design tokens, copy, and structure documented below. The CSS in `colors_and_type.css` is intended to be lifted directly into the codebase as the design-token layer.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, copy, and component anatomy are locked. Pixel-perfect recreation is expected. The only deliberate gaps:

- **Display font** — the production face is **Recoleta** (paid). The mocks substitute **Fraunces 800** from Google Fonts. Swap to Recoleta when implementing if a license is available; otherwise the substitute is acceptable.
- **Hand illustrations** (`assets/hand-pointing.svg`, `assets/hand-pen.svg`) are **placeholder SVGs** in the brand style. Replace with final illustrations.
- **Avatar imagery** — currently solid-color initials. Real photos should slot in at the same dimensions, same border-radius.

---

## Design tokens

All tokens live in `colors_and_type.css` as CSS variables on `:root`. Lift this file into the codebase as the single source of truth.

### Colors

| Token | Hex | Use |
|---|---|---|
| `--mk-cream` | `#f5f1ea` | Default page background |
| `--mk-cream-2` | `#ede7dc` | Cards on cream, hover states |
| `--mk-cream-3` | `#e0d8c8` | Dividers, subtle borders |
| `--mk-navy` | `#0f1e3d` | Primary ink, headings, dark surfaces |
| `--mk-navy-2` | `#1a2a4f` | Navy hover |
| `--mk-ochre` | `#f4a833` | **Primary CTA color**, illustration fill |
| `--mk-ochre-2` | `#e89a1f` | Ochre hover |
| `--mk-lavender` | `#cdbcf5` | Italic display accent, logo circle, decorative |
| `--mk-lavender-2` | `#b8a2eb` | Lavender hover |
| `--mk-white` | `#ffffff` | Card surface |

### Foregrounds

| Token | Hex | Use |
|---|---|---|
| `--fg-1` | `#0f1e3d` | Primary text (navy) |
| `--fg-2` | `#4a5878` | Secondary body |
| `--fg-3` | `#8a93a8` | Tertiary, labels, meta |

### Borders

| Token | Hex | Use |
|---|---|---|
| `--border-1` | `#e0d8c8` | Default hairline on cream |
| `--border-2` | `#cabfa8` | Stronger border / input |
| `--border-on-navy` | `rgba(255,255,255,0.10)` | Hairline on navy |

### Status

- `--ok` `#4ade80` — green pulse on live indicators / "going"
- `--warn` `--mk-ochre` — yellow follow-up flag

### Typography

- **Display**: `Fraunces` (Recoleta substitute), weights `400 500 600 700 800 900` + italic `400 600 700`. Used at weight **800** for all display headings.
- **Body**: `Inter`, weights `300 400 500 600 700`.
- Import line at top of `colors_and_type.css`.

### Type scale

| Class | Size | Weight | LH | Tracking | Use |
|---|---|---|---|---|---|
| `.mk-display-xl` | clamp(48px, 6vw, 88px) | 800 | 0.98 | -2px | Hero h1 |
| `.mk-display-l` | clamp(36px, 4vw, 56px) | 800 | 1.05 | -1.2px | Section h2 |
| `.mk-display-m` | 32px | 700 | 1.1 | -0.8px | Sub-section |
| `.mk-display-s` | 22px | 700 | 1.2 | -0.4px | Card title |
| `.mk-body-l` | 18px | 400 | 1.65 | — | Lead paragraph |
| `.mk-body` | 15px | 400 | 1.65 | — | Default body |
| `.mk-body-s` | 13px | 400 | 1.55 | — | Card body |
| `.mk-eyebrow` | 11px | 600 | — | 2.2px / uppercase | Ochre label above headings |

### Italic accent (signature pattern)

`.mk-italic-accent` — bold italic in lavender with a **skewed pill underline** below. Used sparingly: one accent phrase per display heading, e.g. *"isn't working"* in **"The way it usually works isn't working"**.

Implementation:

```css
.mk-italic-accent {
  font-style: italic;
  font-weight: 800;
  color: var(--mk-lavender);
  position: relative;
  display: inline-block;
}
.mk-italic-accent::after {
  content: '';
  position: absolute;
  left: 2%; right: 2%; bottom: -0.05em;
  height: 0.08em;
  background: var(--mk-lavender);
  border-radius: 999px;
  transform: skewX(-12deg) translateY(0.04em);
  opacity: 0.9;
}
```

For mobile screens an `<em>` shortcut is used instead of `.mk-italic-accent` (no underline, just italic lavender). Both patterns are valid — use the accented underline only on display-xl/display-l size.

### Radii

| Token | Value | Use |
|---|---|---|
| `--r-xs` | 4px | Small chips |
| `--r-sm` | 8px | Inputs |
| `--r-md` | 12px | Cards |
| `--r-lg` | 18px | Hero blocks (mobile) |
| `--r-xl` | 24px | Hero blocks (web) |
| `--r-pill` | 999px | **All buttons** |

### Spacing scale

4 · 8 · 12 · 16 · 24 · 32 · 48 · 80 · 120 px (`--sp-1` through `--sp-9`).

### Shadows

- `--shadow-card`: `0 1px 2px rgba(15,30,61,0.04), 0 8px 24px rgba(15,30,61,0.06)`
- `--shadow-cta`: `0 8px 20px rgba(244,168,51,0.35)` — only on hover of primary CTA

### Buttons

Four variants, all share `.mk-btn` base:

| Variant | Class | Background | Text |
|---|---|---|---|
| Primary CTA | `.mk-btn-ochre` | `--mk-ochre` | `--mk-navy` |
| Secondary | `.mk-btn-navy` | `--mk-navy` | white |
| Tertiary | `.mk-btn-ghost` | `--mk-cream-2` | `--mk-navy` |
| Link | `.mk-btn-link` | transparent | `--mk-navy` (ochre on hover) |

Sizes: default (`14px 22px`), `.mk-btn-sm` (`13px / 10px 16px`), `.mk-btn-lg` (`15px / 16px 28px`). All pill (`999px`).

---

## Screens

### Marketing landing — `ui_kits/landing/`

Sections in order, each with `id` for in-page anchor links:

1. **Nav** — Logo (lavender circle) + nav links (How it works · Contact · Events) + Login (ghost) + Join the waitlist (ochre CTA). 1280px max-width.
2. **Hero** — Two hand illustrations bookend a centered text block. Headline: *"Work together, build together"* (display-xl, no italic accent). Three lines of body copy, then a navy CTA (`How it works`). Hands rotate slightly (-8° left, +6° right).
3. **Problem** — Two columns. Left: eyebrow "The problem" + display-l *"The way it usually works isn't working"* (with italic accent on `isn't working`). Right: three white pain-cards stacked.
4. **Ecosystem** (navy band, full-bleed) — Two columns. Left: lavender italic display *"Two sides. One table."* (with underline accent). Right: 12 role pills in a 3×4 white-tile grid.
5. **Steps** — Centered header, then 4-step row with circular ochre-ringed numbers (`01 02 03 04`) and an SVG arrow weaving through them.
6. **Events** — Section header + "All events →" link. Three event cards in a 3-col grid; each has a colored top zone (ochre, lavender, navy gradient), white date stamp, body with title + meta + tag chips + a navy "Reserve →" button.
7. **CTA** (navy band) — *"Your co-founder is one match away"* centered, ochre CTA.
8. **Footer** — logo + © line + nav links + social icons.

### Member web dashboard — `ui_kits/web/`

Single-page app with sidebar nav switching between 5 screens. **App shell: 248px sidebar + 1fr main, 1440px max-width centered.**

**Sidebar:** brand mark + "Klub" nav group (Home / This month's match `[New]` / Session / Events / Memory) + "Account" group (My brief / Settings) + user footer (avatar + name + role).

**Screens:**

1. **Home** — Pagehead with eyebrow + *"Welcome back, Alex"* (italic accent on first name). Two-column grid:
   - Left: Hero navy match card (date + group + avatars + ochre CTA) → 3-up stats tiles (sessions / met / follow-ups owed) → "This month's group" card with 4 member rows.
   - Right: Upcoming session mini-card (navy date badge) → Follow-up reminders → "From your memory" italic quote card.
2. **Match reveal** — Pagehead + 2×2 grid of full-bio member cards. Each card: rounded-square avatar + ochre role label + Fraunces 800 name + bio paragraph + two ochre/muted tags.
3. **Session** — Navy hero with display-l title + venue + datetime. Below: 4-col info tiles (Time / Group / Format / Status) then 1.5fr/1fr split — agenda timeline left, who's coming + need-to-know cards right.
4. **Memory** — Stats row → "April 2026" / "March 2026" month dividers → 3-col grid of memory cards. Each card: avatar + name + role, italic Fraunces quote on cream-2 with **ochre left-border (3px)**, session label + Note button. Cards with `↻ Follow up` flag get an ochre pill in the top-right.
5. **Events** — 3-col grid of event cards with colored hero zones, going-stack, RSVP button.

### Mobile app — `ui_kits/app/`

Each screen sized 360×760, rendered inside an iPhone-style frame for review. **Implement as full-screen mobile views** (probably React Native, but the design works for any mobile framework). Layout pattern:

- Cream page background
- Top bar: 56px tall, 14/20px padding, optional back/icon buttons + page title
- Scrollable content with 96px bottom padding to clear the floating nav
- **Floating bottom nav** (navy pill, 64px tall, ochre active icon) on tab screens, **OR** a sticky `.mka-action-bar` with primary/secondary buttons on flow screens

**Screens** (8 total, including splash + 3 loaders):

1. **Splash** — Oversized "Makers/Klub" wordmark (Klub italic lavender), lavender logo mark with dashed ochre orbiting ring, hand illustrations peek from top-left + bottom-right, ochre dot-pulse loader at foot.
2. **Home** — Top bar with "Klub" title + search + avatar. Navy hero match card (eyebrow, italic-accent title, meta, avatar stack, ochre CTA). Filter chips. "Your group" rows.
3. **Brief** (step 2 of 5) — Progress bar (5 segments: 1 done lavender, 1 active ochre, 3 empty), step label, display-m question + sub, list of options (icon + title + desc + check). Sticky action bar (Back / Continue).
4. **Match reveal** — Centered eyebrow pill (lavender bg) + display *"Meet your April group"* (italic accent on the group name). 4 member cards stacked, each with rounded-square avatar, ochre role label, Fraunces name, bio. Sticky "Confirm attendance" CTA.
5. **Session** — Navy hero with eyebrow + title + datetime. 2×2 info-tiles grid. "Agenda" timeline with active row highlighted ochre.
6. **Memory** — Top bar (Memory title + search + sort). 3-up stats. Filter chips. Month dividers ("March 2026" / "February 2026") then memory cards. Each card: round avatar + name + session source + optional follow-up flag → italic quote with ochre left-border on cream-2 → Message / Add note buttons.
7. **Loader · Dots** — 3-dot ochre pulse (`mka-dot` keyframe, 1.2s cycle, 0.18s stagger).
8. **Loader · Match shuffle** — 4 chips at compass points scaling in sequence (1.8s cycle, 0.45s stagger). Themed loader for the once-a-month match reveal.
9. **Loader · Skeleton** — 3 placeholder rows with ochre shimmer sweep (`mka-shimmer` 1.4s).

---

## Copy voice

Voice principles documented in `SKILL.md`. Key rules:

- **Short, direct, declarative.** No marketing-speak.
- **One italic-accent phrase per heading.** Always lands the punchline.
- **Lowercase for in-line emphasis, sentence case for headings.**
- **Pet sentences:** *"Two sides. One table."* / *"The way it usually works isn't working."* / *"Your co-founder is one match away."*
- **Number formatting:** `Co-Work #11`, `Session #13`, `Step 02`.
- **Dates:** `Sat 23 May · 10:00–14:00` (24h time, abbreviated weekday + day + month).

Exact copy for every screen lives in the HTML files. Use it verbatim unless a localized variant is needed.

---

## Interactions & behavior

### Marketing landing
- **Smooth scroll** to in-page anchors (`html { scroll-behavior: smooth }`).
- CTA hover: lift ochre shadow `--shadow-cta`, no transform.
- Hand illustrations are static (no animation); they should resize/disappear under 900px.

### Web dashboard
- Sidebar nav swaps screens (see `goto(name, el)` JS in `ui_kits/web/index.html` for the reference behavior). In React, use route-based navigation (`react-router` is already in the codebase).
- Match card avatars: clicking opens the member's brief modal/page (not built in the mock — placeholder).
- Memory cards: "Note" button opens a per-person notes editor (out of scope for this handoff).
- Tooltips & long-press: none — keep interactions explicit.

### Mobile app
- **Bottom nav** active tab swaps content; cream surface stays.
- **Brief flow**: each step animates a horizontal slide (200ms ease-out) when implementing. The progress bar fills cumulatively (segments turn lavender for completed, ochre for active).
- **Match reveal**: cards stagger in (200ms apart, 300ms duration, opacity + 8px translateY) on first load.
- **Splash duration**: 1.2–1.6s before transitioning to either Home (returning member) or Brief step 01 (new sign-up).
- **Skeleton loader**: shows for any request >300ms. Dot-pulse for <300ms transitions.

### Animations summary

| Name | Duration | Easing | Use |
|---|---|---|---|
| `mka-dot` | 1.2s | ease-in-out infinite | Dot-pulse |
| `mka-match` | 1.8s | ease-in-out infinite | Match-shuffle loader chips |
| `mka-shimmer` | 1.4s | ease-in-out infinite | Skeleton sweep |
| `mka-orbit` | 12s | linear infinite | Dashed ring around splash mark |

All keyframes are defined in `ui_kits/app/styles.css`.

---

## State management

### Mobile app
- **Brief state** — 5 steps, persist as draft locally until step 5. On step 5 submit, POST to backend.
- **Match state** — `pending | confirmed | declined` per session. UI shows different action bars per state.
- **Memory state** — read from backend. Local edits to notes/follow-up flags should write-through.
- **Auth** — Clerk (existing pattern in `mk-event-app`).

### Web dashboard
- Identical model; share API contracts with mobile.
- Sidebar tab state can be route-based (URL-driven).

### Data needed
- `currentSession` — date, venue, agenda, attendees + RSVP status
- `upcomingMatches` — array of member objects (id, name, role, bio, avatar color, looking-for/open-to tags, session count)
- `memory[]` — array of past meetings grouped by month, each entry with `personId, sessionId, note, followUpFlag`
- `events[]` — published Luma events with `date, venue, spotsLeft, attendeesGoing, tags`

---

## Assets

| File | Description | Replace? |
|---|---|---|
| `assets/logo.svg` | Lavender circle, navy `MK` wordmark | **No** — final |
| `assets/hand-pointing.svg` | Ochre hand with pointing finger, navy outlines | **Yes — placeholder** |
| `assets/hand-pen.svg` | Ochre hand holding a pen, drawing a curved squiggle | **Yes — placeholder** |

The hands are placeholders matching the brand language (chunky ochre fill, 3px navy outline, rough/skewed contours). Replace with finished illustrations at the same dimensions before launch.

Avatar imagery throughout is solid-color initial circles/squares. When real photo uploads land, they should fit the same circular/rounded-square containers.

---

## Files in this handoff

```
design_handoff_makers_klub/
  README.md                              ← this file
  SKILL.md                               ← agent voice + system rules
  colors_and_type.css                    ← LIFT THIS INTO THE CODEBASE
  assets/
    logo.svg                             ← final brand mark
    hand-pointing.svg                    ← placeholder
    hand-pen.svg                         ← placeholder
  ui_kits/
    landing/
      index.html                         ← marketing site
      styles.css                         ← landing-only CSS
      README.md
    web/
      index.html                         ← member dashboard (5 screens, nav-switched)
      styles.css
      README.md
    app/
      index.html                         ← review canvas of all 8 mobile screens
      styles.css                         ← mobile-only CSS
      ScreenHome.jsx                     ← React component (reference)
      ScreenBrief.jsx
      ScreenMatch.jsx
      ScreenSession.jsx
      ScreenMemory.jsx
      ScreenSplash.jsx                   ← splash + LoaderDots + LoaderMatch + LoaderSkeleton
      README.md
  preview/                               ← design-system cards (foundations)
    brand-logo.html
    brand-illustration.html
    colors-primary.html
    colors-surfaces.html
    components-buttons.html
    components-cards.html
    components-ecosystem.html
    spacing.html
    type-display.html
    type-scale.html
    _card.css
```

---

## Implementation notes for the developer

- **Drop `colors_and_type.css` in first.** It owns every token and is referenced by both kits. No design decisions should be made outside this file.
- **The mobile-app JSX files are reference implementations**, not production. They demonstrate the component anatomy in React but should be re-implemented as proper React Native (or web React + responsive) components in the target app.
- **Existing repos to align with:**
  - `github.com/rungtatushar1987-arch/makers-klub-landing` — vanilla site, deploy via Vercel
  - `github.com/rungtatushar1987-arch/mk-event-app` — React 18 + Vite + TS + Clerk + CSS Modules. The web dashboard belongs here as new pages.
- **Routing**: web dashboard uses `react-router-v6` (already a dep). One route per screen.
- **Forms**: brief flow + RSVP — no library specified; use what the codebase already uses, or `react-hook-form` if nothing.
- **Icons**: the mocks use Unicode glyphs (◇ ✦ ☷ ♡ ◉ ⌕ ⤴ ⋯) as a stand-in for proper icons. Recommend `lucide-react` (or whatever the codebase already uses); replace each glyph with the closest Lucide equivalent. The icon set is small (~12 icons total).
- **Fonts**: Use Recoleta if licensed, otherwise Fraunces 800 from Google. Inter from Google. Avoid `Fraunces` for body text — it's display-only here.

If anything in this package is ambiguous, the source HTML files are the canonical reference. Pixel values in CSS are intentional, not approximations.
