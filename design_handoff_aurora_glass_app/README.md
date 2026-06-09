# Handoff: Makers Klub Member App — "Aurora Glass" redesign

## Overview
This package documents a polished, refined redesign of the **Makers Klub member app** — the
private, post-login product members use to see their monthly match, prep for the co-work
session, and remember the people they met. The visual direction is **"Aurora Glass"**: a
light, white surface lit by soft cosmic gradient blobs (yellow + violet + electric blue),
with heavy frosted-glass cards floating on top. It is the light sibling of the dark
"Midnight Cosmos" marketing system — same hues, inverted for an everyday workspace.

It covers **7 mobile screens** and a **desktop dashboard**.

## About the Design Files
The files in `app-glass/` and the root `Makers Klub App.html` are **design references built
in HTML/React (via in-browser Babel)** — prototypes that show the intended look, layout, and
behavior. **They are not production code to ship directly.** The task is to **recreate these
designs in the Makers Klub app's real codebase** (per the design-system README, the members
app is **React + Vite + TypeScript, Clerk auth, CSS Modules**) using that project's
established patterns, component library, and conventions. If you are starting fresh with no
codebase, pick the most appropriate stack for a production React app and implement there.

Reuse the **token values, measurements, copy, and component recipes** documented below
verbatim — those are the source of truth. Recreate the *structure* idiomatically; do not
paste the prototype JSX/CSS wholesale.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, shadows, and interactions are
final. Recreate the UI pixel-accurately using the codebase's libraries. The one deliberate
placeholder: **member avatars are monograms** (initials on a brand color) — keep them, or
swap to real photos later behind the same shape.

---

## Design Tokens

> In the prototype these live on `.g-root` as CSS custom properties and are re-tunable at
> runtime (see Tweaks). Treat the values below as the canonical light-theme defaults.

### Color — brand hues
| Token | Hex | Use |
|---|---|---|
| Yellow (accent) | `#fcb813` | Primary action, active states, CTAs, highlights |
| Yellow deep | `#e0a000` | Yellow text on light (AA contrast), eyebrows |
| Violet | `#7a4ed8` | Secondary accent, links, stat numerals, gradient cards |
| Violet soft | `#a587f0` | Violet on dark, avatar |
| Electric blue | `#3b6dd9` | Gradient cards, avatars, glow |
| Navy | `#0a1340` | Ink/headings, active chip fill, ink-on-yellow |

### Color — ink ramp (text on light)
| Token | Hex / value | Use |
|---|---|---|
| ink-1 | `#0c1330` | Primary text / headings |
| ink-2 | `#424a6b` | Body / secondary |
| ink-3 | `#818aa6` | Tertiary / labels / captions |

### Color — surfaces & lines
| Token | value |
|---|---|
| Surface (page) | `#ffffff` |
| Hairline | `rgba(12,19,48,0.08)` |
| Hairline strong | `rgba(12,19,48,0.14)` |

### Glass recipe (the core material)
```css
background: rgba(255,255,255,0.55);          /* translucency ~42–55% default */
backdrop-filter: blur(22px) saturate(150%);  /* default blur 22–28px */
-webkit-backdrop-filter: blur(22px) saturate(150%);
border: 1px solid rgba(255,255,255,0.85);    /* bright top-edge highlight */
box-shadow: 0 10px 34px rgba(38,40,90,0.12),  /* soft drop */
            inset 0 1px 0 rgba(255,255,255,0.75); /* inner highlight */
```
- **Strong glass** (bottom nav, secondary buttons): white alpha `0.72`, blur `+6px`.
- Glass needs the **ambient backdrop behind it** to refract — never put glass on flat white.

### Ambient backdrop (sits behind all glass, `z-index:0`, `opacity ~0.9`)
```css
background:
  radial-gradient(42% 30% at 18% 8%,   rgba(252,184,19,0.55) 0%, transparent 70%),  /* yellow TL */
  radial-gradient(48% 34% at 96% 30%,  rgba(122,78,216,0.45) 0%, transparent 72%),  /* violet R */
  radial-gradient(60% 38% at 50% 104%, rgba(59,109,217,0.42) 0%, transparent 70%),  /* blue bottom */
  radial-gradient(40% 26% at 80% 88%,  rgba(165,135,240,0.35) 0%, transparent 72%); /* soft-violet */
```

### Gradient (hero / session / profile-header cards)
```css
background: linear-gradient(140deg, rgba(122,78,216,0.95) 0%, rgba(59,109,217,0.92) 100%);
/* + a soft yellow radial glow blob in one corner */
box-shadow: 0 18px 44px rgba(80,60,200,0.34);
border: 1px solid rgba(255,255,255,0.22);
```

### Typography
- **Display / UI labels / buttons:** **Poppins** — 600 (semibold), 700 (bold), 800 (headlines).
  Tight tracking on big headlines (`-0.5px` to `-1px`). (Alternate explored: Fraunces serif.)
- **Body / paragraphs:** **Inter** — 400/500/600.
- **Logo wordmark only:** **Caveat** (handwritten "makers"), italic 700.
- Scale (px): topbar title 27/700 · screen H2 28–30/700 · card title 15–20/700 ·
  body 13–14/400 · eyebrow 10–11/700 uppercase, letter-spacing 1.6–1.8px · stat numerals 26/800.

### Radius
| Token | px | Use |
|---|---|---|
| r (lg) | 22 | Hero/session/profile gradient cards, rail cards |
| r-sm | 14 | List rows, member cards, tiles, options, settings rows |
| r-xs | 10 | Inner pills, small icon boxes |
| pill | 999 | Buttons, chips, tab bar, toggles, avatars (circle) |

### Spacing
4-based. Common: screen gutter **18–22px**, card padding **14–22px**, list gaps **8–10px**,
section header padding `10px 22px 6px`. Mobile screen content has **52px top** (status bar)
and **110px bottom** (floating tab bar) clearance.

### Shadows
- Glass drop: `0 10px 34px rgba(38,40,90,0.12)` + inset top highlight.
- Yellow CTA glow: `0 10px 24px rgba(252,184,19,0.40)`.
- Gradient card: `0 18px 44px rgba(80,60,200,0.34)`.

---

## Avatar palette (monograms)
Initial on a solid brand color, white or navy text per contrast. Rounded-square (`14px`) in
lists/grids, circle in headers/stacks.
| Color | Hex | Text |
|---|---|---|
| Yellow | `#fcb813` | `#0a1340` |
| Violet | `#7a4ed8` | `#ffffff` |
| Blue | `#3b6dd9` | `#ffffff` |
| Navy | `#0a1340` | `#ffffff` |
| Soft violet | `#a587f0` | `#0a1340` |

---

## Screens / Views

### Shared chrome (mobile)
- **Device target:** iPhone-class, ~372×794 screen. Status bar (time + signal/wifi/battery)
  at top, dynamic island centered.
- **Top bar:** screen title (Poppins 27/700) left; round 38px **glass icon buttons** right
  (search, avatar, settings, etc). Back-arrow variant on flow screens.
- **Bottom tab bar (persistent):** floating **glass pill**, 66px tall, inset 18px from edges,
  5 tabs — Klub (◇), Match (✦), Session (▦), Memory (♡), Me (◉). Active tab: label + icon go
  ink-dark, and the **icon sits in a yellow pill** (40×28, yellow glow). Inactive: ink-3.
- **Action bar (flow screens):** bottom-anchored, gradient-to-surface fade, holds primary
  (yellow pill) + optional secondary (glass pill) button.

### 1. Splash
- **Purpose:** first launch / loading.
- **Layout:** centered column. Yellow **96px roundel "MK"** (Poppins 800, navy text, yellow
  glow shadow) with a **dashed violet ring that rotates** (`mka-orbit`, 12s linear infinite).
  Below: wordmark — "makers" in Caveat italic violet (40px) over "KLUB" Poppins 800 navy
  (52px). Tagline "BERLIN · FOUNDERS × CREATIVES" (eyebrow). Footer: 3-dot pulse loader
  (yellow, `mka-dot` 1.2s stagger) + "v2.0 · FOUNDING MEMBERS".

### 2. Home · Match feed (tab: Klub)
- **Purpose:** the member's hub — see this month's match, browse the group.
- **Layout:** scroll. (a) **Hero match card** — violet→blue gradient, yellow eyebrow
  "APRIL MATCH · GROUP OF 4", headline "You're matched with *3 makers*" (yellow emphasis),
  meta line, **overlapping avatar stack** (4, -8px overlap, white ring), yellow CTA pill
  "View Session →". (b) **Filter** chips row (All active = navy fill / others glass).
  (c) **"Your group"** section header + "See all" link (violet). (d) **List of 4 member rows**
  — glass row: rounded-square avatar, name + small "Match" tag (violet-tint pill), role · sub,
  outline "View" button.

### 3. Brief · Onboarding (step 2 of 5)
- **Purpose:** capture what the member is, to drive matching.
- **Layout:** back button + "2 of 5". **5-segment progress bar** (done = violet, active =
  yellow, todo = hairline). Step label "YOUR BRIEF · 02" (yellow eyebrow). Question
  "What best describes *you?*" (Poppins 28/700, violet emphasis) + sub. **4 selectable option
  cards** (glass): icon tile (violet-tint; turns yellow when selected) + title + desc +
  check circle. Selected = yellow border + `0 0 0 3px rgba(252,184,19,0.22)` ring. Action bar:
  Back (glass) + "Continue →" (yellow).

### 4. Match reveal
- **Purpose:** the once-a-month "your group dropped" moment.
- **Layout:** centered intro — violet-tint eyebrow pill "April · Match #04", headline
  "Meet your *April group*" (violet emphasis), subtext. Then **4 member cards** (glass, larger
  16px-radius avatar): role (yellow eyebrow), name (15/700), bio, and a **green live pulse dot**
  (`g-pulse` 2s) at right. Action bar: "Confirm attendance →" (yellow).

### 5. Session detail
- **Purpose:** everything about the upcoming co-work session.
- **Layout:** back + "SESSION" + more. **Gradient hero** (violet→blue, yellow corner glow):
  "Session #12" eyebrow, "Monthly Co-Work" (Poppins 28/700), location/date. **2×2 info grid**
  (glass tiles): Time / Location / Group / Format — each label (10px caps, ink-3) + value
  (Poppins 16/600). **Agenda timeline:** vertical rule with dots; active step dot = yellow with
  `0 0 0 4px` yellow ring; time (tabular) + title + desc. Action bar: Directions (glass) +
  "Open chat →" (yellow).

### 6. Memory
- **Purpose:** remember who you met — the platform's signature feature.
- **Layout:** title "Memory" + search/sort icons. **3-stat grid** (glass): Met 14 / Follow up 3
  / Saved 7 — numerals in violet (Poppins 800/26). Filter chips. **Grouped by month**
  (month label with trailing hairline rule). Each **memory card** (glass): circular avatar +
  name + "role · Co-Work # · venue", optional **"↻ Follow up" flag** (yellow-tint pill).
  Below, an **italic Poppins quote/note** with a **yellow left-border** on a faint yellow wash.
  Meta row: "Message" + "Add note" outline buttons.

### 7. Profile · Settings (tab: Me)
- **Purpose:** identity, brief, preferences, account.
- **Layout:** title "Profile" + search/gear. **Gradient header card** (centered): 84px
  circular avatar (yellow→orange gradient, white ring), name (Poppins 24/700), role line,
  **"✦ Founding member" badge** (yellow pill). **3-stat grid** (Sessions 11 / Met 14 /
  Follow up 3). **"Your brief"** section + Edit link + chips (Founder · Fintech, Looking for:
  Brand designer, Open to founders). **"Preferences"**: settings rows with **toggle pills**
  (Match notifications, Session reminders) — toggle on = yellow, knob slides 18px.
  **"Account"**: settings rows with chevron (Membership, Appearance, Privacy & data) +
  a **danger "Sign out"** row (red-tint icon + red label).

### Desktop · member dashboard
- **Purpose:** the same product on a wide canvas.
- **Frame:** macOS-style window, **1240px** wide, traffic lights + `app.makersklub.de` URL.
- **Layout:** ambient backdrop fills the window; content is **glass sidebar + scrolling main**.
  - **Sidebar (250px, glass):** logo roundel + "Makers Klub / BERLIN"; "MENU" nav (Klub active
    = navy pill w/ yellow icon, others hover violet-tint); pinned footer user card (avatar +
    "Alex M. / Founding member").
  - **Main (scrolls):** topbar — greeting "Good morning, *Alex*" (violet emphasis) + sub on the
    left; **glass search pill** + yellow "+ New brief" on the right. Then a **2-col split
    (`1fr 332px`)**:
    - **Left:** wide **gradient hero match card** (eyebrow, "You're matched with *3 makers*",
      meta, avatar stack, yellow "View session →"); then "Your April group" + "See directory";
      then a **2-col grid of 4 glass member cards** (rounded-square avatar, name, role eyebrow,
      bio, "Message" [yellow] + "View profile" [outline]; hover lifts -3px).
    - **Right rail:** **"Upcoming · Session #12"** glass card (title, date, 2×2 mini info tiles,
      navy "Confirm attendance →"); **"Follow-ups"** glass card (avatar rows + note + yellow dot).

---

## Interactions & Behavior
- **Tab bar / nav:** switching tabs swaps the active screen; active tab animates the yellow
  pill behind the icon. (Prototype shows states statically per screen.)
- **Brief option select:** single-select; selected card gains yellow border + ring + yellow
  icon tile. (`useState` in prototype.)
- **Toggles (Profile):** tap flips on/off; knob translateX 18px, track → yellow, 0.18s ease.
- **Hover (desktop):** member cards `translateY(-3px)` 0.15s; nav items get violet-tint bg.
- **Buttons:** primary = yellow w/ glow; press `translateY(1px)`. Secondary/ghost = glass.
- **Live pulse dot** (match cards): expanding ring, 2s ease-out infinite.
- **Splash:** rotating dashed ring (12s) + 3-dot pulse loader.
- **Easing:** interactive 0.15s ease; toggles 0.18s; ambient loops 2–12s. Nothing bouncy.
- **Reduced motion:** gate the splash ring / pulse / dot loops behind
  `@media (prefers-reduced-motion: no-preference)`.

## State Management
- `activeTab` — which of the 5 tabs/screens is showing.
- `briefSelection` — chosen role on the Brief step (one of founder/designer/creator/producer);
  plus step index (1–5) for the flow.
- `notifications`, `sessionReminders` — booleans for Profile toggles.
- **Data (replace mock arrays with real fetches):** current match group (members: initial,
  color, name, role, blurb), upcoming session (time/location/group/format + agenda steps),
  memory entries (person, venue, month, note, follow-up flag), profile (name, role, stats,
  brief tags, membership). The prototype hardcodes these in `screens.jsx` / `desktop.jsx`.

## Theming / Tweaks (optional, but informative)
The prototype exposes a live **Tweaks panel** so stakeholders can dial the system. These map
directly to the tokens and are worth wiring as theme variables:
- **Glass blur** (4–44px), **translucency** (white alpha), **corner radius** (8–34px).
- **Backdrop glow** (ambient blob opacity 0–140%).
- **Accent color** (yellow / orange / violet / blue — `--accent`; ink auto-picks navy or white
  by luminance).
- **Dark mode** — full dark variant (`.g-dark`): surface `#060a22`, glass = white at low alpha
  (0.08–0.20), ink inverts to white ramp, brighter blobs. All tokens already defined for it.
- **Headline font** — Poppins ↔ Fraunces.

## Assets
- **Logo:** yellow roundel, "makers" (Caveat italic) over "KLUB" (Poppins 800). Drawn in
  markup/SVG — no raster needed. (`assets/logo.svg` in the design-system project.)
- **Icons:** the prototype uses Unicode glyphs (◇ ✦ ▦ ♡ ◉ › ↻ ✦ ⚙ ⌕ ⏻) as **placeholders**.
  In production, substitute a real line-icon set (e.g. **Lucide**, ~1.5px stroke, 18–20px) at
  the same positions. Keep icons single-color (`currentColor`).
- **Avatars:** monograms (see palette). No photography in the system yet.
- **Fonts:** Poppins, Inter, Caveat — all Google Fonts (and Fraunces for the alt headline).
- **Reference screenshots:** see `reference-shots/` (mobile, desktop, profile).

## Files (in this bundle)
| File | What it is |
|---|---|
| `Makers Klub App.html` | Entry point — loads React+Babel, the CSS, and all screen scripts; lays out the 7 phones + desktop frame on the stage; wires the Tweaks panel. |
| `app-glass/glass.css` | The full **Aurora Glass** theme — tokens on `.g-root` (+ `.g-dark`), device frame, and every `.mka-*` mobile component. **Source of truth for values.** |
| `app-glass/desktop.css` | Desktop dashboard layout (`.gd-*`): window chrome, sidebar, hero, member grid, right rail. |
| `app-glass/screens.jsx` | The 7 mobile screens + device frame + bottom nav (React, exported to `window`). |
| `app-glass/desktop.jsx` | The desktop dashboard component. |
| `app-glass/tweaks-panel.jsx` | Tweak-panel scaffold (prototype-only; not needed in production). |
| `reference-shots/*.png` | Rendered references — mobile screens, desktop dashboard, profile. |

> To preview the prototype as-is: serve the bundle folder over a local static server
> (e.g. `npx serve`) and open `Makers Klub App.html` — it needs files served over HTTP for the
> Babel scripts to load, not `file://`.
