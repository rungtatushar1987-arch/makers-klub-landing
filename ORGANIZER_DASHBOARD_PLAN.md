# Organizer Dashboard — Plan

**Status:** Phase 1 (schema migration) shipped 15 June 2026, but its data
model needs a correction — see "Schema correction" below before continuing
to Phase 1.5. See `BUILD_LOG.md` for the original Phase 1 session writeup.
**Phase 1 correction + Phase 1.5 to be executed in a separate conversation.**

## Purpose & end goal

This whole effort exists to make Makers Klub **licensable as a platform**, not
just the app for one community.

**End goal:** once all phases below are complete, Makers Klub can onboard
other organizations — other communities, event series, professional networks
— as separate tenants on the same platform. Each org gets its own event
series, member roster, and management dashboard, isolated from every other
org's. Organizers get a dashboard to understand and manage their own
community, and an org's roster, event data, and organizer-level analytics are
never visible outside that org — including to Makers Klub itself.

**Crucially, this isolation applies to org-level operational data, not to a
member's personal identity or network.** A person's profile, and the
connections/notes/follow-ups they've built up, belong to *them* — not to any
one org — and follow them across every community they're part of on the
platform. This is the existing product promise ("one network across every
community you join") and the schema must not break it. See "Schema
correction" for why this matters.

**How each phase contributes:**

- **Phase 1 (done, needs correction)** gives events a home (`org_id`), so
  org-specific data *can* be separated. The correction replaces the
  profile-level `org_id`/`org_role` columns with a proper membership table —
  see below.
- **Phase 1.5** makes org separation real and enforceable by the database
  itself — the database can verify who's asking and which org(s) they belong
  to, instead of trusting the app to behave.
- **Phase 2** wires the app to scope org-specific queries correctly (and adds
  an "active org" concept for members of multiple orgs), and writes the real
  org-scoped RLS policies now that identity is verifiable.
- **Phase 3** gives organizers the actual tools to manage their org — member
  directory, event check-ins, retention insights.
- **Phase 4** brings that same capability to the mobile/PWA experience.

**What "done" looks like:** a second org can sign up, get its own `org_id`,
have its members log in via Clerk, and see only their own roster, events, and
org analytics — with no code changes required per new org, no risk of
cross-org data leakage in either direction, and no disruption to any member's
personal network even if they belong to multiple orgs.

## Schema correction (replaces the original Phase 1 approach)

The original Phase 1 migration added `org_id` and `org_role` directly onto
`profiles`, treating org membership as a single hard-isolation boundary on a
member's *identity itself* — one profile belongs to exactly one org, and RLS
would gate everything (including `connections` and `tasks`) on that one
`org_id`.

That's the wrong shape. It would mean a connection made at one org's event
becomes invisible the moment you're "in" a different org's context — directly
contradicting "your network follows you everywhere," which is already the
pitch on the marketing site. It also forces a 1:1 person↔org relationship,
which doesn't hold once a person is, say, a member of Makers Klub *and* a
licensed partner community.

**Corrected split:**

- **Org-owned** (gets isolated per org): events, RSVPs/attendance for those
  events, and org membership/roles. This is what the Organizer Dashboard
  needs and what licensing isolation is actually about.
- **Person-owned** (never org-scoped): `profiles` identity, `connections`,
  `tags`, `follow_up`, `tasks`, notes. Gated only by "is this your own row,"
  same as today.

Org membership becomes a many-to-many relationship via a new `org_members`
table, not a column on `profiles`.

## Context

Makers Klub is moving from a single-tenant model (one shared schema that *is*
Makers Klub) to a platform other community owners can license and run their
own network on. This doc captures the schema change and phased plan for the
first "Organizer Dashboard" — a lightweight analytics/management view for
community operators, built first on the web dashboard
(`/Users/tusharrungta/Documents/MakersKlub/app`), later ported to the PWA
(`mk-event-app`).

## Current schema (as of Phase 1, pre-correction)

Supabase project `xfvigqggnpajnidkutmk`, all in `public` schema:

- **organizations** — created in Phase 1. One row exists: Makers Klub
  (`slug = 'makers-klub'`, id `cf84f186-0d86-40c3-baa7-b5f33598d0fd`).
- **profiles** — members. `role` (free-text job title), `role_category`
  (enum: founder/designer/photographer/videographer/creator/developer/other).
  Phase 1 added `org_id` and `org_role` columns here — **to be superseded by
  `org_members`, see below**.
- **events** — `type` (cowork/social/workshop/other). Phase 1 added `org_id`
  here; this column is correct and stays.
- **event_rsvps** — links `clerk_user_id` to `event_id`, status
  `going`/`interested`. No "attended" status yet.
- **connections** — per-member connection graph (`clerk_user_id` ↔
  `connected_clerk_user_id`), with `tags`, `follow_up`, `action_tags`,
  `remind_followup`, notes. Always person-owned, never org-scoped.
- **tasks** — follow-up tasks linked to a connection. Always person-owned.
- **gigs**, **notified_jobs** — job board features, unrelated to this work.

`KlubContext.tsx` currently queries `profiles.select('*')` and
`events.select('*')` with **no filtering** — every member sees every profile
and event in the database. This is the critical thing that has to change
alongside the schema, not after.

## Corrected schema changes

### `organizations` — unchanged from Phase 1

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| slug | text, unique | e.g. `makers-klub` |
| owner_clerk_user_id | text | who created/owns this org |
| created_at | timestamptz | |

Branding fields (logo, colors) still deferred — not needed for MVP.

### New table: `org_members` (replaces `profiles.org_id` / `profiles.org_role`)

| column | type | notes |
|---|---|---|
| id | uuid PK | |
| org_id | uuid, FK → `organizations.id` | |
| clerk_user_id | text, FK → `profiles.clerk_user_id` | |
| org_role | text, default `'member'`, check in `('owner','admin','member')` | |
| joined_at | timestamptz | |

Unique constraint on `(org_id, clerk_user_id)`. A person can have rows in
`org_members` for multiple orgs — this is what makes multi-org membership
work without duplicating profiles.

### `profiles` — drop the org columns added in Phase 1

- Remove `org_id` and `org_role` (or, if dropping is risky mid-migration,
  stop referencing them anywhere and drop in a later cleanup pass).
- `profiles.clerk_user_id` remains the one portable identity per person.
- Optional, non-blocking: a denormalized `home_org_id` purely for display
  defaults (e.g. which org's branding to show on first load) — explicitly
  **not** used for any RLS or data-isolation decision.

### `events` — `org_id` unchanged from Phase 1

Stays as-is: every event belongs to exactly one org.

### `connections`, `tasks` — unchanged, never org-scoped

These remain gated purely on `clerk_user_id` ownership. No `org_id` column,
no org-aware RLS. This is the part of the correction that actually keeps the
"network follows you" promise intact — and it means this part of the schema
needs *no new work* at all.

## Migration / backfill steps (revised)

1. `organizations` row for Makers Klub already exists (Phase 1) — no change.
2. Create `org_members` table.
3. Backfill: for every existing `profiles` row, insert one `org_members` row
   with `org_id = makers-klub` and `org_role` copied from the existing
   `profiles.org_role` value (`owner` for Tushar, `member` for everyone
   else).
4. Backfill `events.org_id = makers-klub` on all existing rows — unchanged
   from the original Phase 1 plan (this part was correct).
5. Stop reading/writing `profiles.org_id` / `profiles.org_role` anywhere in
   the app; drop the columns once `org_members` is verified working.

## RLS (revised)

Need to inspect current RLS policies before writing the migration (still not
yet reviewed in detail). Target state:

- `organizations`: readable by members (via `org_members`); writable by
  `owner`/`admin` of that org.
- `org_members`: readable by other members of the same org (this is what
  drives the Organizer Dashboard's member directory); writable only by
  `owner`/`admin` of that org.
- `events`: readable by members of that event's org, via a join through
  `org_members` (`events.org_id` matches an `org_members` row for the current
  user).
- `event_rsvps`: scoped transitively via `events.org_id` → `org_members`.
- `profiles`: own row fully writable. Read access stays broad (name, role,
  bio, social links are deliberately shared for networking) — **no org
  dimension in this policy**, matches today's open behavior.
- `connections` / `tasks`: strictly own-row only —
  `clerk_user_id = auth.jwt() ->> 'sub'`. Never org-scoped.

This single design does both jobs at once: org-specific operational data
(roster, attendance, analytics) is isolated per org via `org_members`, while
a member's personal CRM (connections, notes, follow-ups) is isolated per
*person* and travels with them across every org they belong to.

## App-side changes (Phase 2, revised)

- `KlubContext.tsx`: org-scoped queries (events, roster/`org_members`) now
  join through `org_members` instead of `profiles.org_id`.
- Because a user can belong to multiple orgs, the app needs an **"active
  org"** concept — which org's events/dashboard is currently in view. Likely
  a small `OrgContext` holding the list of the user's `org_members` rows plus
  a selected "active" one (workspace-switcher pattern), defaulting to the
  user's only org if they have just one.
- Personal CRM views (`connections`, `tasks`) need **no org filtering at
  all** — this part of the app gets simpler under the corrected model, not
  more complex.

## Organizer Dashboard (Phase 3)

New gated section in `Sidebar.tsx`, visible only when the user has an
`org_members` row with `org_role` `'owner'` or `'admin'` for the active org.
New route, e.g. `/organizer`, with three sub-views:

### 1. Member directory & activity

Table of all members in the org (via `org_members` joined to `profiles`):
name, role / role_category, joined date, events attended (count from
`event_rsvps` for this org's events), last activity timestamp. Searchable,
sortable.

**"Connections made" stat:** this should count connections *tagged to this
org's events*, not a member's entire personal network — i.e. a filtered view
of their existing person-owned `connections` data (already taggable to an
event via the existing `tags`/`follow_up` columns), not a separate
org-scoped dataset.

### 2. Event attendance & check-ins

Per-event view: RSVP counts (going vs. interested), attendee roster, and a
check-in flow to mark who actually showed up (new `attended` status on
`event_rsvps`, or a new `event_checkins` table — decide during Phase 3).

### 3. Retention & engagement

- Members with no event attendance in X weeks (at-risk / churn list)
- New vs. returning attendees per event
- Active-members trend over time (simple chart)

## Phased plan (revised)

- **Phase 1 (correction)** — Add `org_members`, migrate `profiles.org_role`
  data into it, stop relying on `profiles.org_id`/`org_role` for isolation,
  drop those columns once verified. *Run in a separate conversation.*
- **Phase 1.5** — Clerk ↔ Supabase auth integration (blocking prerequisite —
  see below), and write the RLS policies described above against
  `org_members`.
- **Phase 2** — Update `KlubContext`/queries per "App-side changes" above,
  including the new "active org" concept.
- **Phase 3** — Build Organizer Dashboard UI (the three views above), wired
  to real data.
- **Phase 4** — Port Organizer Dashboard to the PWA (`mk-event-app`).

## Phase 1 results (done, superseded in part)

- `organizations` table created, seeded with one row: Makers Klub
  (`slug = 'makers-klub'`, id `cf84f186-0d86-40c3-baa7-b5f33598d0fd`). **Still
  correct, no change needed.**
- `events.org_id` added, all existing rows backfilled to Makers Klub. **Still
  correct, no change needed.**
- `profiles.org_id` / `profiles.org_role` added, all existing rows backfilled
  to Makers Klub (Tushar as `owner`, everyone else `member`). **Superseded —
  see "Schema correction." This data needs to move into the new
  `org_members` table; the columns on `profiles` should then be dropped.**
- **RLS review**: existing policies on `profiles`/`events`/`event_rsvps`/
  `connections`/`tasks` are all `USING (true)` — effectively unenforced
  regardless of identity. No Clerk JWT ↔ Supabase auth mapping exists, so
  org-scoped RLS isn't implementable yet — there's no verified identity to
  check against. **Deferred** — not written as part of Phase 1 to avoid
  fake/spoofable policies. Prerequisite for real isolation: Clerk → Supabase
  auth integration (custom JWT template), tracked as Phase 1.5 below.

## Phase 1.5 — Clerk ↔ Supabase auth integration (blocking prerequisite)

**Status:** Not started. Required before Phase 2's org-scoped RLS means
anything for real licensing.

### In plain terms

Right now every app (web dashboard, PWA) gets handed the same master key (the
Supabase anon key) to the database. Anyone holding that key can open any
drawer in the cabinet — fine today since there's only one tenant, but it
means org isolation can't exist yet.

To support other orgs, the database needs a security desk: when someone
connects, they show their badge (their Clerk login), the desk checks "which
org(s) do you belong to, and with what role?", and only lets them into that
org's operational data. Other orgs' data stays locked to them — but their own
personal CRM is always theirs regardless of which org's "room" they're
standing in.

Three pieces of work:

1. **Clerk ↔ Supabase trust** (config, low effort, Tushar) — Clerk and
   Supabase agree to recognize each other's badges. Mostly dashboard settings
   on both sides; no shared secret needed (Supabase's newer "Third-Party
   Auth" support verifies Clerk tokens via Clerk's public JWKS endpoint).
2. **App rewiring** (code, the big piece) — `app/src/supabase.ts` currently
   exports one static client built with just the anon key, imported
   everywhere. It needs to become session-aware, attaching the logged-in
   user's Clerk token to every request. Touches every file that imports
   `supabase`.
3. **Coordinated rollout across both apps** — RLS policies apply to *every*
   client. If RLS starts requiring a badge before the PWA is updated to show
   one, the PWA gets locked out and breaks. Either both apps (web dashboard +
   `mk-event-app`) need the rewiring roughly together, or RLS needs a
   transition period — new org-scoped policies added *alongside* the
   existing open `true` ones, only removing the open ones once both clients
   are verified working.

### Technical breakdown

- Clerk's session token has a `sub` claim equal to the Clerk user ID — the
  same string already stored in `profiles.clerk_user_id`.
- Once Clerk ↔ Supabase trust is configured, RLS policies can read
  `auth.jwt() ->> 'sub'` directly for `profiles`/`connections`/`tasks`
  ownership checks, and via a join through `org_members` for
  `events`/`event_rsvps`/`org_members` itself. Example helper for "is this
  user a member of org X":

  ```sql
  create function public.is_org_member(target_org uuid) returns boolean
  language sql stable
  as '
    select exists (
      select 1 from public.org_members
      where org_id = target_org
        and clerk_user_id = auth.jwt() ->> ''sub''
    )
  ';
  ```

- App-side: `app/src/supabase.ts`'s singleton export needs to become a client
  created with an `accessToken` callback pulling the live token from Clerk's
  `useSession()` — likely threaded through `KlubContext` or a small provider
  rather than a static module export.

### Effort assessment — TBD

Need to grep both codebases for how widely `supabase` is imported before
sizing this (web dashboard `app/src/`, PWA `mk-event-app/src/`).

## Open questions for Phase 2+

- "Attended" status: new column on `event_rsvps` vs. new `event_checkins`
  table.
- Confirm `org_role` assignments beyond Tushar (any other admins for Makers
  Klub org) — to be migrated into `org_members`.
- **Multi-org membership is now in scope** (previously assumed out of
  scope). UX question: how does a member with multiple `org_members` rows
  switch between orgs in the app — workspace switcher in the sidebar?
  Defaults to "only org" if they have just one, so this is invisible for
  every current Makers Klub member.
- Should events/dashboards ever surface across orgs (e.g. a cross-org public
  events feed), or stay strictly per-org for now? Leaning strictly per-org
  for Phase 3, revisit later.
- Should `profiles.org_id`/`org_role` be dropped immediately as part of the
  correction, or left as unused dead columns until Phase 1.5 lands and the
  migration is verified end-to-end?

---

## Session — 21 June 2026 — Organiser Dashboard Spec

### Status at session start

- Phase 1.5 complete and verified
- `profiles.org_id` and `profiles.org_role` confirmed dropped (verified via `information_schema.columns`)
- `org_members` is the canonical membership table; `jwt_is_org_admin()` SECURITY DEFINER helper in place, checks `org_role IN ('owner', 'admin')`
- Tushar (`user_3E5D484FC0PzCZpEVqBeKCYOnbM`) confirmed as `owner` of the Makers Klub org in `org_members`
- No `/admin` route, no admin page, no admin component exists — clean slate
- Aurora Glass design system fully implemented across Dashboard, Events, Network, Profile, Login, Signup

### Core decision

Repurpose the existing web dashboard (`app.makersklub.com`) as the Organiser Dashboard rather than building a separate tool. Route: `/admin`. Same Aurora Glass look and feel as all other pages. Organiser-only — all data and analytics on this page are gated behind `org_role IN ('owner', 'admin')`.

### Architecture decisions

- **Route:** `/admin` with a guard component that redirects non-admins to `/home`
- **Sidebar:** new “Organiser” section below “Account”, visible only to org admins. Single nav item: “Dashboard” → `/admin`
- **Page structure:** three tabs — Members · Events · Analytics
- **Data layer:** new `OrgAdminContext` (or inline queries), separate from `KlubContext` which is member-scoped. Admin queries use `jwt_is_org_admin()` already in place
- **Gender / age fields:** deferred. Requires GDPR consent page during onboarding before collecting. Added to backlog
- **Paying member:** `is_paying` boolean on `org_members`, manually managed by admin. Schema hook for future Luma/Stripe integration
- **Attendance % threshold:** only surface after 5 events hosted. Before that, suppress the column entirely — data is noise
- **Network graph:** deferred. High demo value but high build cost. Post-launch

### Feature spec — full agreed list

#### Must-have (build first)

1. **Member Directory** — searchable list of all org members via `org_members` joined to `profiles`. Shows name, role/bio, join date, avatar. Core CRM view.
2. **Stats Bar** — headline numbers at top of the page: total members, total events, total RSVPs. Simple, demo-friendly trust signal.
3. **Event List with Attendance** — all events scoped to this org. Each row: date, title, RSVP count.
4. **Per-Member Event History** — click a member → see which events they attended. Expand-in-place or minimal overlay.

#### Good to have (second pass)

5. **Attendance % per member** — (events attended by this member) / (total events hosted by org). Single number replaces the three separate “regulars / no-shows / at-risk” list concepts; one metric covers all three. **Suppressed until 5 events have been hosted** — before that threshold, column does not appear.
6. **Connection count per member** — how many connections each member has made inside the community. Identifies super-connectors.
7. **Last seen / active at** — date of most recent RSVP or attendance. Lets organiser spot quiet members without manual tracking.
8. **Role filter + additional filters** — filter directory by `role_category`. Additional filter options: paying/not, attendance range (active / quiet / new). Age and gender deferred (not in schema yet; GDPR consent page required first).
9. **Paying member flag** — manual `is_paying` boolean on `org_members`, toggled by admin. Honest and shippable now. Schema hook left for future ticketing integration when Luma/Stripe is wired up.
10. **CSV export** — export the member list. High perceived value for organiser ops (emails, invoicing, planning).

#### Cherry on top

11. **At-risk flag** — auto-badge members who are “quiet”. Definition agreed: member who attended at least once, then no attendance or RSVP in the last 60 days. Visual badge on their card. No manual work, instant insight. Strongest proof the product does something LinkedIn doesn’t.
12. **Super-connector highlight** — rank members by connection count, surface top 3–5. Gamification lite. Demo-friendly — makes the product feel alive.
13. **Network graph teaser** — small force-directed graph, who’s connected to whom across the org. Purely visual, no interactions. Demo showstopper. **Deferred — expensive to build.**

#### Analytics tab (organiser-only)

Goal: help organiser target the right audience for events and newsletters.

Three use-cases identified:
- **Event targeting** — role breakdown + past attendance by event type → “who should I invite to this kind of event?”
- **Newsletter targeting** — attendance % + last seen → “who’s engaged vs cold?”
- **Growth** — member acquisition over time (simple line or bar chart)

### What gets built next session

1. Migration: add `is_paying` boolean (nullable, default `false`) to `org_members`
2. `/admin` route + guard component (redirect non-admins to `/home`)
3. `Admin.tsx` + `Admin.css` — three-tab page (Members · Events · Analytics), Aurora Glass
4. `Sidebar.tsx` update — “Organiser” section + Dashboard link, shown only to `owner`/`admin`
5. `App.tsx` — add `/admin` route

### Backlog additions from this session

- GDPR consent page during onboarding (required before collecting age/gender)
- Age + gender fields on `profiles` (post-GDPR consent flow)
- Luma/Stripe ticketing integration (replaces manual `is_paying` flag)
- Network graph visualisation (organiser dashboard, cherry, post-launch)
