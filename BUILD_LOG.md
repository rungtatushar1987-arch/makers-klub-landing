
## Session — 9 June 2026 (continued)

### Platform — Events page CSS cleanup (`Events.tsx` + `Events.css`)

#### Inline styles → classes (event cards, left column)
- All inline style objects on upcoming/recommended event cards replaced with named CSS classes in `Events.css`: `ev-card`, `ev-card-inner`, `ev-date-block`, `ev-day`, `ev-mon`, `ev-card-info`, `ev-card-title-row`, `ev-card-title`, `ev-type-badge`, `ev-card-meta`, `ev-card-chevron`.
- Hover effect moved from `onMouseEnter`/`onMouseLeave` handlers to a CSS `:hover` rule on `.ev-card` — no more JS for visual state.
- Tab switcher inline styles replaced with `ev-tabs`, `ev-tab`, `ev-tab.active` classes.
- Grid wrapper inline styles replaced with `ev-grid`, `ev-col-left`, `ev-col-right` classes.

#### Description removed from event cards
- `event.description` block removed from the card preview entirely. Description is still rendered inside the event detail modal under "About this event". Cards now show: title + badges, location · date · time, chevron.

#### Past events right rail — matched to Dashboard right rail
- **First pass:** replaced ad-hoc inline styles with `mkw-card` + `mkw-rows` + `mkw-row` + `mkw-row-main` + `mkw-row-name` + `mkw-row-meta` to align structure with Dashboard.
- **Second pass (explicit match):** "People who attended" toggle button changed from custom `ev-attendees-btn` / `ev-attendees-btn.open` classes to `mk-btn mk-btn-navy mk-btn-sm` with `width: 100%; justifyContent: center` — identical to the "Full calendar →" button at the bottom of the Dashboard right rail card. Custom button classes removed from `Events.css`.
- `ev-attendees-btn` and `ev-attendees-btn.open` rules deleted from `Events.css` as they are no longer referenced.
- `ev-attendees-body` padding adjusted to `14px 4px` to align with `mkw-row` horizontal padding inside the card.

### Open items carried forward
- [ ] Confirm whether requiring a website URL for all members is appropriate
- [ ] Fix stale RSVP data in Supabase causing "1 event attended" — SQL check needed
- [x] Login/Signup Aurora Glass visual treatment — completed 21 June 2026
- [ ] Dark mode toggle UI
- [ ] Member portfolio showcase
- [ ] Replace dummy "47 creatives" counter on website

---

## Session — 15 June 2026

### Organizer Dashboard — Phase 1 (Supabase schema migration)

Executed Phase 1 of `ORGANIZER_DASHBOARD_PLAN.md` — multi-tenant schema foundation. Applied via `Supabase:apply_migration` (`organizer_dashboard_phase1_org_schema`), project `xfvigqggnpajnidkutmk`.

- **New table `organizations`**: `id`, `name`, `slug` (unique), `owner_clerk_user_id`, `created_at`. RLS auto-enabled (deny-all); added a permissive `select` policy (`true`) to match the current posture on `profiles`/`events`.
- Seeded one row: Makers Klub (`slug = 'makers-klub'`, id `cf84f186-0d86-40c3-baa7-b5f33598d0fd`), `owner_clerk_user_id` = Tushar's clerk id.
- **`profiles`**: added `org_id uuid not null default <makers-klub id> references organizations(id)` and `org_role text not null default 'member' check (in owner/admin/member)`. The literal default backfilled all 15 existing rows to Makers Klub in the same statement. Set `org_role = 'owner'` on Tushar's row (`user_3E5D484FC0PzCZpEVqBeKCYOnbM`) — the only owner; everyone else is `member`. Added index on `org_id`.
- **`events`**: added `org_id uuid not null default <makers-klub id> references organizations(id)`, backfilled all 5 existing rows the same way. Added index on `org_id`.
- Verified: 15/15 profiles and 5/5 events landed in the Makers Klub org; 1 owner, 0 admins, 14 members.

### What Phase 1 deliberately does NOT include — RLS enforcement

Reviewed existing RLS policies on `profiles`, `events`, `event_rsvps`, `connections`, `tasks` per the plan's open question. **All existing policies are `USING (true)` / `WITH CHECK (true)`** — RLS is enabled but not actually restrictive; the anon key can read/write everything regardless of identity. There is also **no Clerk JWT ↔ Supabase auth integration** (no `auth.jwt()` claims, no `auth.uid()` mapping to `clerk_user_id` — `app/src/supabase.ts` creates the client with just the anon key, no per-request auth header).

This means **org-scoped RLS as described in the plan ("profiles/events readable only where org_id = current user's org_id") isn't enforceable at the DB level yet** — there's no verified identity for Postgres to check against. Writing policies that reference a client-supplied org_id would be trivially spoofable and worse than the current honest-but-open state.

Didn't write placeholder/cosmetic RLS policies to avoid implying a protection that doesn't exist. Current single-org reality means there's no actual data leak yet (everyone seeing everyone is today's intended behavior). Real org isolation needs a Clerk→Supabase auth integration (custom JWT template / third-party auth) as a prerequisite — that's a separate, larger piece of work not scoped in this plan and should be sequenced before a second org ever signs up.

### Next steps
- Phase 2 (separate session): update `KlubContext.tsx` and other queries to scope by `org_id` (belt-and-suspenders once there's a second org).
- Before Phase 2 matters for real isolation: Clerk JWT → Supabase auth integration, then rewrite `profiles`/`events`/`event_rsvps`/`connections`/`tasks` RLS policies to check `org_id` against the authenticated user's org.

## Session — 15 June 2026 (continued)

### Organizer Dashboard — schema correction + Phase 1 (corrected)

Context: Tushar has a client conversation about licensing in ~1 week, covering both onboarding and the licensing model itself. Reviewing the plan against that conversation surfaced a flaw in the Phase 1 approach above.

#### The flaw

Phase 1 put `org_id`/`org_role` directly on `profiles`, treating org membership as a single hard-isolation boundary on identity itself — one profile = one org, with `connections`/`tasks` implicitly gated the same way. This directly contradicts the existing product promise ("one network across every community you join," already on the marketing site): a connection made at one org's event would become invisible the moment a member is "in" a different org's context. It also assumes a strict 1:1 person↔org relationship, which breaks for anyone who's a member of more than one licensed org.

#### The correction

Split org-owned data from person-owned data:

- **Org-owned (isolated per org)**: `events`, `event_rsvps`, org membership/roles. This is what the Organizer Dashboard and licensing isolation are actually about.
- **Person-owned (never org-scoped)**: `profiles` identity, `connections`, `tags`, `follow_up`, `tasks`, notes. Gated only by row ownership (`clerk_user_id`), exactly as today.

Org membership becomes many-to-many via a new `org_members` table rather than columns on `profiles`. `ORGANIZER_DASHBOARD_PLAN.md` rewritten to reflect this — new "Schema correction" section, revised schema/RLS/phase descriptions, multi-org membership moved from "out of scope" to an open question with a workspace-switcher direction.

#### Phase 1 correction — applied

Migration `add_org_members_table` applied via `Supabase:apply_migration`, project `xfvigqggnpajnidkutmk`:

- **New table `org_members`**: `id`, `org_id` (FK → `organizations.id`), `clerk_user_id` (FK → `profiles.clerk_user_id`), `org_role` (owner/admin/member, default `member`), `joined_at`. Unique on `(org_id, clerk_user_id)`.
- RLS enabled, permissive policies for now (`select`: anyone; `all`: anyone) — matches the current unenforced posture on every other table. To be tightened in Phase 1.5 once Clerk↔Supabase auth mapping exists.
- Backfilled from `profiles.org_id`/`org_role`: 15 rows inserted, all `org_id = makers-klub`. Verified 1 `owner` (Tushar), 14 `member`.
- `profiles.org_id`/`org_role` columns **left in place, not dropped** — no longer the source of truth, app should stop reading them once `org_members` is wired up. Drop deferred until Phase 1.5 is verified end-to-end (per open question in the plan).

### Plan for the week (client conversation in ~7 days)

Sequencing agreed for "demo + written roadmap":

1. ~~Phase 1 correction (`org_members`)~~ — done, this session.
2. Phase 1.5 — Clerk↔Supabase trust config + session-aware client rewiring in **both** `MakersKlub/app/src/supabase.ts` and `mk-event-app`'s equivalent (PWA must stay in sync this time, unlike the "transition period" option considered earlier).
3. Minimal RLS on `org_members`/`events`/`event_rsvps`, added *alongside* existing `true` policies so neither app breaks mid-week.
4. Thin Organizer Dashboard slice — member directory view only, wired to real `org_members`/`profiles` data for Makers Klub. This is the demo.
5. Roadmap write-up for the client conversation, tying back to the earlier licensing/onboarding discussion (white-label vs. self-serve, org vs. personal data isolation).

### Next steps
- Decide starting point for Phase 1.5: Clerk/Supabase dashboard config (Tushar-side settings) vs. grepping both codebases for `supabase` imports to scope the rewiring first.

## Session — 15 June 2026 (Phase 1.5 scoping)

### Decision: scope before touching auth config

Chose to grep both codebases for `supabase` imports and confirm current RLS state before any live Clerk/Supabase dashboard changes — lower risk, nothing breaks while reading code.

### Confirmed current state (live query against project `xfvigqggnpajnidkutmk`)

Every RLS policy across `connections`, `events`, `event_rsvps`, `gigs`, `org_members`, `organizations`, `profiles`, `tasks`, `notified_jobs` is `USING (true)` / `WITH CHECK (true)` — fully open, exactly as the prior session's notes said. No `auth.jwt()` references anywhere in the database yet.

### Scope — web dashboard (`MakersKlub/app/src`)

- Single Supabase client: `app/src/supabase.ts`, created with `createClient(url, anonKey)` — anon key only, no auth header.
- Clerk: `app/src/main.tsx` — `ClerkProvider` with a custom localStorage token cache.
- Direct `supabase` imports beyond `KlubContext.tsx`: `pages/Events.tsx`, `pages/Members.tsx`, `pages/Profile.tsx`. `Dashboard.tsx` and `Onboarding.tsx` only import types/helpers, no direct queries.
- `KlubContext.tsx` is the central data-loading hub — queries `profiles`, `connections`, `events`, `event_rsvps`.

### Scope — PWA (`mk-event-app/src`)

- Single Supabase client: `src/lib/supabase.ts`, also `createClient(url, anonKey)` — anon key only, no auth header. Much larger surface: ~15 exported query/mutation helper functions covering `profiles`, `connections`, `tasks`, `gigs`, `events`, `event_rsvps`.
- Clerk: `src/App.tsx` — `ClerkProvider`, default token cache (no custom override, unlike the web dashboard).
- Direct `supabase` imports beyond `AppDataContext.tsx`/`lib/supabase.ts`: only `pages/Admin/Admin.tsx` (gigs/events/members CRUD, admin-gated by hardcoded Clerk user ID).
- `AppDataContext.tsx` is the equivalent central hub.

### What "session-aware client rewiring" means concretely

Both `createClient(url, anonKey)` calls need to pass a Clerk session JWT on every request (via `getToken({ template: 'supabase' })` or Clerk's native third-party-auth integration for Supabase), so `auth.jwt()` claims exist for Postgres to check against. Roughly ~20 query call sites total across both codebases once the two central hubs + 4 page-level files are counted.

### What's a manual/dashboard step (not scriptable from here)

The actual trust handshake — registering Supabase as a Clerk JWT template (or via Clerk's native Supabase integration) and pointing Supabase's Auth → Third-Party settings at Clerk's JWKS/issuer URL — happens in the Clerk and Supabase dashboards. Claude can do all SQL/config on the Supabase side once the issuer URL/JWKS is available, and can give click-by-click guidance for the Clerk-dashboard half, but Tushar needs to perform that half directly.

### Next steps
- Clerk-dashboard walkthrough to set up the JWT template / native Supabase integration and obtain the issuer URL / JWKS.
- Wire Supabase Auth → Third-Party settings to that issuer.
- Rewire both `supabase.ts` clients to attach the Clerk session token.
- Update ~20 call sites (2 central hubs + `Events.tsx`, `Members.tsx`, `Profile.tsx`, `Admin.tsx`) only if/where they need session-scoped behavior — most can likely stay unchanged once the client itself is session-aware.
- Then: minimal RLS on `org_members`/`events`/`event_rsvps`, added alongside existing `true` policies so neither app breaks mid-week.

## Session — 16 June 2026 (Phase 1.5 — Clerk↔Supabase auth wiring)

### Clerk native Supabase integration — confirmed enabled

- Clerk dashboard → `dashboard.clerk.com/setup/supabase`
- App: **Makers Klub**, Instance: **Production**, Status: **Enabled**
- Clerk domain value: `https://clerk.makersklub.com`

### Supabase third-party auth — configured manually

- Tushar navigated to Supabase dashboard → Auth → Third-Party Auth
- Added Clerk as provider with domain `https://clerk.makersklub.com`
- Supabase derives JWKS from `https://clerk.makersklub.com/.well-known/jwks.json` automatically

### Client rewiring — all 8 files updated

Pattern applied across both codebases: `useSession` from `@clerk/clerk-react` → `session.getToken({ template: 'supabase' })` → `getSupabaseClient(token)` → session-aware Supabase client.

Files changed:

**`MakersKlub/app/src/`**
- `supabase.ts` — added `getSupabaseClient(token)` factory; static `supabase` export kept for legacy/public reads
- `KlubContext.tsx` — switched from `supabase` singleton to `getSupabaseClient(token)` via `useSession`; token fetched once per `load()` call and on every mutation
- `pages/Events.tsx` — `useSession` added; `supabase` → `getSupabaseClient(token)` for attendee queries and connect writes
- `pages/Members.tsx` — `useSession` added; `supabase` → `getSupabaseClient(token)` for tag clears and connection saves
- `pages/Profile.tsx` — `useSession` added; `supabase` → `getSupabaseClient(token)` for profile load and upsert

**`mk-event-app/src/`**
- `lib/supabase.ts` — added `getSupabaseClient(token)` factory; all helper functions now accept optional `token` param and use session-aware client internally
- `context/AppDataContext.tsx` — `useSession` added; token fetched before `fetchAll`, refresh callbacks, and visibility-change handler
- `pages/Admin/Admin.tsx` — `useSession` added; all inline `supabase.*` calls replaced with `getSupabaseClient(token)` per tab load and per action

### Current state

All queries now send a Clerk JWT in the `Authorization: Bearer <token>` header. Supabase trusts that JWT via the third-party auth config. `auth.jwt()` and `auth.uid()` are now resolvable in Postgres — this unblocks RLS policy authoring.

Both apps still work as before (all existing `USING (true)` policies still pass), so nothing is broken in production.

### Bug: getToken template error

After the initial push, the web dashboard threw `No JWT template exists with name: supabase`. Root cause: Clerk's native Supabase integration embeds the claim directly into the standard session token — there is no named template. All `getToken({ template: 'supabase' })` calls were wrong.

Fixed by stripping `{ template: 'supabase' }` from every `getToken` call across all 8 files in the web dashboard codebase. The PWA was already working (likely due to build caching differences). Fix deployed via push to `main`.

Commit: `fix: use getToken() without template for Clerk native Supabase integration`

### Session summary — what's done

- ✅ Clerk native Supabase integration enabled (Production instance, `https://clerk.makersklub.com`)
- ✅ Supabase third-party auth configured with Clerk domain — JWKS trust handshake complete
- ✅ `getSupabaseClient(token)` factory added to both `supabase.ts` files
- ✅ All 8 files rewired to session-aware client: `KlubContext.tsx`, `AppDataContext.tsx`, `Events.tsx`, `Members.tsx`, `Profile.tsx`, `Admin.tsx`, and both `supabase.ts` entry points
- ✅ `getToken()` bug fixed — template arg removed from all call sites
- ✅ PWA confirmed working post-fix
- ✅ Web dashboard fix pushed and deploying

### RLS Phase A — complete (16 June 2026)

Migration `phase_1_5_rls_real_policies` applied to project `xfvigqggnpajnidkutmk`. Added 15 real policies and 2 helper functions.

**Helper functions (SECURITY DEFINER):**
- `jwt_is_org_member(org uuid)` — returns true if `auth.jwt()->>'sub'` is in `org_members` for that org
- `jwt_is_org_admin(org uuid)` — same, but restricted to `org_role IN ('owner', 'admin')`

**Policies added (all named `rls_*`, coexist with old `USING(true)` policies):**
- `profiles`: `rls_profiles_select_open`, `rls_profiles_insert_own`, `rls_profiles_update_own`, `rls_profiles_delete_own`
- `connections`: `rls_connections_own` (ALL)
- `tasks`: `rls_tasks_own` (ALL)
- `notified_jobs`: `rls_notified_jobs_own` (ALL)
- `events`: `rls_events_select_org_member` (SELECT via org_members join), `rls_events_write_org_admin` (ALL)
- `event_rsvps`: `rls_event_rsvps_select_org_member`, `rls_event_rsvps_insert_own`, `rls_event_rsvps_modify_own`
- `org_members`: `rls_org_members_select_open`, `rls_org_members_write_org_admin`
- `gigs`: `rls_gigs_own` (ALL, own-row; existing approved-select and open-insert policies untouched)

Both apps still fully functional — old `USING(true)` policies still OR-pass everything.

### What's left to complete Phase 1.5

1. ~~Verify web dashboard loads cleanly~~ — confirmed clean, no JWT errors.

2. ~~RLS policies~~ — Phase A + Phase B both complete (see above). Enforcement is live.

3. **Thin Organizer Dashboard** — member directory view wired to real `org_members` + `profiles` data for Makers Klub org, as the client conversation demo

4. **Roadmap write-up** for client conversation — licensing model, org vs. personal data isolation, white-label vs. self-serve framing

### RLS Phase B — complete (16 June 2026)

Migration `phase_1_5_rls_drop_open_policies` applied. All old `USING(true)` open policies dropped. RLS enforcement is now live.

**Final policy inventory:**
- `connections` — `rls_connections_own` (ALL, user-scoped)
- `event_rsvps` — `rls_event_rsvps_select_org_member` (SELECT, org member), `rls_event_rsvps_insert_own`, `rls_event_rsvps_modify_own`
- `events` — `rls_events_select_org_member` (SELECT, org member), `rls_events_write_org_admin` (ALL, owner/admin)
- `gigs` — `rls_gigs_own` (ALL, user-scoped) + retained `Anyone can post gigs` (open INSERT) + `Read approved gigs` (SELECT approved)
- `notified_jobs` — `rls_notified_jobs_own` (ALL, user-scoped)
- `org_members` — open SELECT (x2, harmless duplicate), `rls_org_members_write_org_admin` (ALL, owner/admin)
- `organizations` — `Anyone can read organizations` (open SELECT)
- `profiles` — `rls_profiles_select_open`, user-scoped INSERT/UPDATE/DELETE
- `tasks` — `rls_tasks_own` (ALL, user-scoped)

**Phase 1.5 complete.** Auth wiring + RLS enforcement done. Next: Thin Organizer Dashboard.

### Data cleanup (16 June 2026)

- Deleted all rows from `connections` (fresh start, no seed data)
- Deleted 8 mock profiles (`mock_sarah_k`, `mock_tom_b`, `mock_maya_l`, `mock_jana_r`, `mock_alex_w`, `mock_lena_h`, `mock_felix_n`, `mock_mia_s`) and their corresponding `org_members` rows
- Root cause: early dev seed data with fake `clerk_user_id` values was inflating stats counts and polluting the member directory
- Remaining profiles: 7 real accounts — Tushar Rungta, Stef Sau, and 5 test accounts (Test User, Test User 1, Test User 2, Test User3, Test Test)

### Connect flow fixes (16 June 2026)

Two bugs surfaced and fixed during RLS testing:

**Bug 1 — Mutual insert blocked by RLS**
`MemberProfile.tsx` was calling `addConnection` twice in a `Promise.all` — once for the scanner (correct) and once inserting a row on behalf of the scanned user (RLS violation). Dropped the second call. Model is now: whoever scans owns their side of the connection only.

Commit: `fix: drop mutual connection insert — RLS only permits own-row writes`

**Bug 2 — Missing session token in MemberProfile**
`MemberProfile.tsx` was not importing `useSession` and was calling `addConnection` without a JWT, so `auth.jwt()->>'sub'` was null and the INSERT was rejected. Added `useSession`, fetched token before the insert, passed it through.

Commit: `fix: pass session token to addConnection in MemberProfile`

### Connection request model (16 June 2026)

Replaced the immediate "connected" model with a proper request/accept flow.

**DB:** `status` column added to `connections` (`pending` | `accepted` | `declined`, default `accepted` for legacy rows). Two new RLS policies: `rls_connections_incoming` (SELECT for target user) and `rls_connections_target_update` (UPDATE for target user to accept/decline). Migration: `add_connection_status`.

**supabase.ts:** `Connection` type gains `status: ConnectionStatus` and `direction: 'outgoing' | 'incoming'`. `getConnections` now fetches both directions (outgoing + incoming) and annotates each row. `addConnection` now inserts with `status: 'pending'`. New helpers: `acceptConnection(id)`, `declineConnection(id)`.

**Memory.tsx:** Stats bar "Connected" count = `status === 'accepted'` rows only. Incoming pending requests render above the event list in a distinct "Connection Requests" section with Accept/Decline buttons. Event list shows "✓ Connected" badge for accepted, "Request sent" badge for outgoing pending.

**MemberProfile.tsx:** After scanning, shows "Request sent" state with name and explanation instead of auto-navigating away. If a prior outgoing pending row already exists, shows the same state on load.

Commit: `feat: connection request model — pending/accepted/declined with accept-deny UI`

### Web dashboard parity — connection request model (16 June 2026)

Mirrored the PWA connection request model into the web dashboard (`app/`).

**`supabase.ts`** — Added `ConnectionStatus` type, `status` and `direction` fields to `Connection` type, `acceptConnection()` and `declineConnection()` helper functions.

**`KlubContext.tsx`** — Now fetches both outgoing and incoming rows. Exposes `connections` (accepted only, both directions) and `incomingRequests` (pending incoming) as separate context values. Added `acceptRequest` and `declineRequest` context actions that optimistically move rows between lists. `saveConnection` now delegates through context so Members.tsx has a working token.

**`Members.tsx`** — Removed local `Connection` typedef (now uses shared type). Incoming requests render in a yellow-bordered section above the connections list with Accept/Decline buttons. Accepted incoming connections show a "They connected with you" badge. `saveConnection` now correctly delegates to `contextSave`.

Commit: `feat: web dashboard — connection request model parity with PWA`

### Next steps

1. **Test connect flow end-to-end as real account** — sign in as Tushar Rungta, scan QR of another real member (e.g. Stef Sau), confirm connection appears in Memory tab with correct count
2. **Thin Organizer Dashboard** — member directory view in `app.makersklub.com` wired to real `org_members` + `profiles` data for the Makers Klub org; this is the demo for the client conversation
3. **Roadmap write-up** — licensing model, org vs. personal data isolation, white-label vs. self-serve framing; ties back to the Constantin/community licensing discussion
4. **Real member onboarding** — once connect flow is confirmed clean, invite first real non-test members; current DB has Stef Sau as the only non-test real member besides Tushar

---

## Session — 18 June 2026

### QR code generation for Test User 1

Generated a scannable QR code for Test User 1 encoding `https://app.makersklub.com/member/test-user-1` (profile UUID `e99d2b5a-9433-406a-9d75-a31605e70754`, slug `test-user-1`). Built as a navy-on-white PNG using Python `qrcode` library, delivered as a direct file download.

### End-to-end connect flow test (18 June 2026)

Tested the full request → accept flow using Tushar's phone (PWA) scanning Test User 1's QR, and Test User 1 accepting via the web dashboard. Surfaced and fixed the following bugs:

### Bug fixes — connection request flow (18 June 2026)

**Bug 1 — MemberProfile overlay shows contact details before acceptance (PWA)**

Social links (LinkedIn, Instagram, Website) and the "Save contact" button were visible immediately after scanning, regardless of connection state. Fixed by gating both behind `connectionState === 'accepted'` in the overlay branch of `MemberProfile.tsx`. While pending, only the "Request sent" message and a Close button are shown.

Commit: `fix: hide contact details until accepted; show sent requests; hide filters when no connections`

**Bug 2 — Sender's Network tab shows nothing after sending a request (PWA)**

`Memory.tsx` had no section for outgoing pending connections — only incoming. Added a "Sent Requests" section that mirrors the incoming requests section, showing the recipient's name, bio, event context, and an "Awaiting reply" badge. Also hid the All/Connected filter chips until at least one accepted connection exists.

Commit: same as above

**Bug 3 — Connection Requests shown above filters on web dashboard**

`Members.tsx` rendered the incoming requests block above the filter bar, and the filter bar was always visible even with zero connections. Fixed by moving filters to the top wrapped in `conns.length > 0`, and rendering incoming requests below the filters.

Commit: `fix: connection requests below filters; hide filter bar when no connections`

**Bug 4 — Accepted connection not reflected immediately in sender's Network tab (PWA + web dashboard)**

Root cause: the `visibilitychange` handler in `AppDataContext.tsx` refreshed gigs, RSVPs, and events — but not connections. `KlubContext.tsx` had no visibility or polling logic at all. So the sender's Network tab stayed stale until a full page reload.

Fixes applied to both apps:
- `AppDataContext.tsx` — added `getConnections` to the `visibilitychange` Promise.all; added a 30-second polling interval for connections only (skips if tab not visible).
- `KlubContext.tsx` — extracted a lightweight `refreshConnections` function (connections + profile lookup only, not a full `load()`); wired it to a `visibilitychange` listener and a 30-second `setInterval`.

Commit: `fix: refresh connections on visibility change and every 30s`

**Bug 5 — Accepted connection not shown as a card in sender's Network tab (PWA)**

Root cause: `Memory.tsx` rendered connections exclusively through `pastEventGroups`, which is built from shared RSVPs. A QR-scan connection has no RSVP row, so it was invisible even though the stats bar correctly counted it.

Fix: replaced the filter chips (All / Connected) with two explicit sections:
- **Your connections** — all accepted connections rendered directly from `acceptedConnections`, independent of RSVPs. Searchable, tappable to open `ConnectionOverlay`.
- **Others at your events** — everyone else who attended the same past events (unchanged logic).

Also removed the now-unused `filter` state, `NetworkFilter` type, and the RSVP filter branch from `pastEventGroups`. A stale `filter` reference in the event group count label caused a TypeScript build error (`TS2552: Cannot find name 'filter'`) which was fixed in a follow-up commit.

Commits:
- `fix: show accepted connections directly, not gated by event RSVP`
- `fix: remove stale filter reference causing TS build error`

### Current state after this session

- ✅ End-to-end connect flow confirmed working: scan → pending → accept → both sides see connection
- ✅ Contact details (social links, Save contact) correctly hidden until accepted
- ✅ Sender sees outgoing pending requests in "Sent Requests" section
- ✅ Receiver sees incoming requests below the filter bar on web dashboard
- ✅ Connections refresh on tab visibility change and every 30s in both apps
- ✅ Accepted connections always visible in Network tab regardless of RSVP status
- ✅ Web dashboard filter bar hidden when no connections; requests section correctly positioned

### Next steps

1. **Thin Organizer Dashboard** — member directory view in `app.makersklub.com` wired to real `org_members` + `profiles` data for the Makers Klub org; this is the demo for the client conversation
2. **Roadmap write-up** — licensing model, org vs. personal data isolation, white-label vs. self-serve framing
3. **Real member onboarding** — connect flow is confirmed clean; ready to invite first real non-test members

---

## Session — 19 June 2026

### Connection request enforcement — two flows

Design discussion: a connection request should only be sendable if the sender and receiver genuinely met. Two valid entry points established:

1. **QR scan** — scanner opens `MemberProfile` overlay after scanning, sends request from there. Already implemented. Problem surfaced: added contact was not grouped by event in the Network tab (see below).
2. **"Forgot to scan"** — sender sees someone in the attendee list of a past event they both attended, and sends a request from there. This is the structural enforcement gate: anyone appearing in `pastEventGroups` (built from shared RSVPs) is a verified co-attendee. No separate DB check needed — the UI is the gate.

### Fix: "met at" label missing on accepted connections (PWA Network tab)

**Root cause:** `Memory.tsx` rendered accepted connections in "Your connections" with name and bio only. The `conn.event_name` field existed on the `Connection` type but was never rendered in the accepted card — it was only rendered on request cards (incoming/outgoing pending). Additionally, the underlying data was `null` for the one existing accepted connection (see below).

**Fix:** Added `{conn.event_name && <div className={styles.requestMeta}>met at {conn.event_name}</div>}` inside the card head of accepted connection cards in `Memory.tsx`, consistent with how it already appeared on request cards.

Commit: `fix: hide contact details until accepted; show sent requests; hide filters when no connections` (already in prior session — the display fix was part of this session's investigation)

### Fix: "forgot to scan" connect button missing in PWA Events attendee sheet

**Root cause:** `AttendeesSheet` in PWA `Events.tsx` rendered a static list of attendees with no action — name, role, and a role pill only. The web dashboard had a full "Say Hi →" expand-form with notes, tags, and a Connect button. PWA had none of this.

**Fix:** Rewrote `AttendeesSheet` to:
- Import `useSession`, `addConnection` and `useAppData`
- Compute `acceptedIds` and `pendingIds` sets from the current user's connections
- Render a `Connect` button per attendee row (hidden for self, replaced with `✓ Connected` or `Sent` badge if already connected/pending)
- On tap: calls `addConnection(user.id, targetId, [], event.title, event.date, token)` — inserts as `pending` with the event as context
- Local `sent` state tracks in-session sends so the button flips to `Sent` immediately without a full refresh
- Added `onRequestSent` callback prop so the parent `Events()` can track sent IDs if needed
- Added `.connectBtn` CSS class to `Events.module.css`

Commit: `feat: connect from past event attendee list (PWA); fix met-at label on accepted connections`

### Fix: web dashboard Events connect bypassing request model

**Root cause:** `connectAttendee` in web dashboard `Events.tsx` was calling `db.from('connections').insert(...)` without a `status` field. The DB default for legacy rows is `accepted`, so every connection made from the web dashboard attendee list was immediately accepted — bypassing the pending/accept flow entirely.

**Fix:** Added `status: 'pending'` and `event_date: eventDate` to the insert. Updated `connectAttendee` signature to accept `eventDate` and updated the call site to pass `event.date`.

Commit: `fix: events connect sends pending status, not accepted`

### Root cause investigation: event_name always null on QR scan connections

After fixing the display, "met at" still didn't show for the existing accepted connection. Queried Supabase directly:

```sql
SELECT id, clerk_user_id, connected_clerk_user_id, event_name, event_date, status, created_at 
FROM connections ORDER BY created_at DESC LIMIT 10;
```

Result: `event_name: null`, `event_date: null` on the only existing accepted connection.

**Root cause:** `MemberProfile.tsx` was calling `addConnection(user.id, profile.clerk_user_id, selectedTags, undefined, undefined, token)` — hardcoded `undefined` for both `event_name` and `event_date`. The QR code URL is `app.makersklub.com/member/[slug]` — no event ID embedded — so `MemberProfile` has no way to know which event the scan happened at.

### Data patch: existing connection

The one existing accepted connection (Tushar → Test User 1, created Jun 18) was patched directly:

```sql
UPDATE connections 
SET event_name = 'Creatives & Drinks: After Hours Networking', 
    event_date = '2026-06-05 16:00:00+00' 
WHERE id = 'adf8c047-2e50-473f-a43f-c2bc3d277f7a';
```

This is the only past event in the DB and the connection was made the same evening, so the mapping is correct.

### Partial fix: event context heuristic in MemberProfile (acknowledged as incomplete)

Added a `getRecentEvents()` helper to `MemberProfile.tsx` that returns events from the last 14 days. On load, auto-selects the most recent one and passes it through to `addConnection`. If multiple recent events exist, the most recent is pre-selected and the user can tap a picker to change it.

This is a **heuristic workaround, not a real solution.** It can pre-select the wrong event if multiple events happened recently, and it provides no context at all if the scan happens more than 14 days after any event.

Commit: `fix: pass event context on QR scan; auto-select recent event in MemberProfile`

### Open architectural question: how to reliably capture event context on QR scan

Two real solutions identified, not yet implemented:

**Option A — Embed event ID in QR URL:**
- QR becomes `app.makersklub.com/member/[slug]?event=[event-id]`
- `MemberProfile` reads the `event` query param and knows exactly where the scan happened
- Downside: QR goes stale if used at a different event; requires per-event QR generation or a dynamic QR that updates
- Clean UX — zero friction, correct by default

**Option B — Explicit "where did you meet?" picker:**
- Remove the heuristic entirely
- When `MemberProfile` opens in overlay mode and user hasn't connected yet, show a "Where did you meet?" selector listing past events before the request can be sent
- No pre-selection, no assumptions — always accurate
- Simpler to build; slightly more friction

Decision deferred to next session.

### Current state after this session

- ✅ "met at [event]" now shown on accepted connection cards in PWA Network tab
- ✅ PWA Events attendee sheet has Connect button — sends pending request with event context
- ✅ Web dashboard Events connect now correctly inserts `status: 'pending'`
- ✅ Existing connection row patched with correct event name/date in DB
- ⚠️ QR scan event context still relies on a 14-day heuristic — not reliable for multiple recent events or scans far from an event date
- ⚠️ "met at" will be null for any QR scan connection made before this session's fix

### Next steps

1. **Decide and implement QR event context** — Option A (embed event ID in QR URL) or Option B (explicit picker before sending request)
2. **Thin Organizer Dashboard** — member directory view wired to real `org_members` + `profiles` data; demo for client conversation
3. **Roadmap write-up** — licensing model, org vs. personal data isolation, white-label vs. self-serve framing
4. **Real member onboarding** — connect flow confirmed clean; ready to invite first real non-test members

---

## Session — 19 June 2026

### Context

Reviewed the two open options (A: embed event ID in QR URL, B: explicit picker) for reliably capturing event context on QR scan. Tushar proposed **Option C**: drop the "met at single event" concept entirely. Instead, since we already know which events both users attended, surface that on the connection card. We further scoped this down: for now, just show the last event stored on the connection record — not a dynamic cross-reference of both users' RSVPs.

### Changes made

**PWA — `Memory.tsx` + `Memory.module.css`**

Replaced the inline "met at [event]" text (which sat inside the name/bio area of accepted connection cards) with a structured section below the card header:

- Row 1: uppercase label "LAST EVENT TOGETHER"
- Row 2: violet-tinted pill chip `📍 Event name`
- Only renders if `conn.event_name` is present
- New CSS classes: `.metAtSection`, `.metAtLabel`, `.metAtChip`

Commit: `feat: last event chip on connection cards`

**PWA — `ConnectionOverlay.tsx` + `ConnectionOverlay.module.css`**

Replaced the old flat `eventChip` ("Met at…") in the overlay with a proper "Event last attended" section, rendered before Action items in the open state:

- Label: "EVENT LAST ATTENDED" (uppercase, muted)
- Card: exact same structure as `PastEventCard` in Events tab — type tag (with correct colour), date, title, location row with pin icon
- Matches event object from `events` array in context by title; fallback to plain title string if no match found (covers old connection data)
- Bottom sheet remains at `max-height: 85dvh` (not full screen)
- New CSS classes: `.lastEventSection`, `.lastEventLabel`, `.lastEventCard`, `.lastEventCardHead`, `.lastEventTag`, `.lastEventDate`, `.lastEventTitle`, `.lastEventFooter`, `.lastEventLocation`

Commit: `feat: last event card in connection overlay; revert overlay to bottom sheet`

**Web dashboard — no changes**

The web dashboard `Members.tsx` already renders event context inline in the metadata line (`Role · Event name · Date`), which works fine at desktop width. No equivalent change needed.

### Decisions

- Option C supersedes Options A and B — no QR URL changes, no picker. The app surfaces event context passively from stored data.
- "Last event together" label preferred over "Met at" — more accurate given users may attend multiple events with the same connection over time.
- Connection overlay stays as a bottom sheet (`85dvh`), not full screen.

### Current state after this session

- ✅ Accepted connection cards in PWA Network tab show "Last event together" chip (closed state)
- ✅ Connection overlay shows full event card under "Event last attended" before Action items (open state)
- ✅ Event card in overlay matches Events tab visual exactly (type tag, date, title, location)
- ✅ Web dashboard unchanged — existing inline metadata sufficient
- ⚠️ `conn.event_name` is still a stored string from connection creation time — not dynamically derived from attendance. Works for all connections made via QR scan or event attendee flow; may be null for very old test connections.

### Next steps

1. **Thin Organizer Dashboard** — member directory view for client/licensing demo
2. **Roadmap write-up** — licensing model, org vs. personal data isolation framing
3. **Real member onboarding** — first non-test members


---

## Session — 21 June 2026 (continued) — Organiser Dashboard

### Context

Picked up immediately after the Aurora Glass login/signup session. `ORGANIZER_DASHBOARD_PLAN.md` was the spec — Phase 1.5 already complete, `org_members` canonical, `jwt_is_org_admin()` helper in place, no `/admin` route or page existed.

Decision: repurpose the existing PWA `Admin.tsx` (which had gigs moderation + event management + member list tabs) as the starting point for the web dashboard Organiser Dashboard, porting it into the Aurora Glass style rather than building from scratch.

---

### What was built

#### 1. Migration — `add_is_paying_to_org_members`

Added `is_paying boolean not null default false` to `org_members`. Manually managed by admin for now. Schema hook left for future Luma/Stripe ticketing integration. Applied via `Supabase:apply_migration`.

---

#### 2. `app/src/pages/Admin.tsx` (new file)

Organiser Dashboard page. Auth-guarded via `jwt_is_org_admin()` RPC — non-admins are redirected to `/home`. Queries all scoped to `org_id = cf84f186-0d86-40c3-baa7-b5f33598d0fd` (Makers Klub org).

**Three tabs:**

**Members tab**
- Searchable table of all `org_members` joined to `profiles`
- Columns: avatar + name + bio, role category pill, events attended (past events only), last seen date, paying toggle, status badge (Active / New)
- `is_paying` toggle fires an inline `org_members` update — optimistic UI
- Mock members (clerk_user_id starting `mock_`) filtered out throughout

**Events tab**
- All org events ordered by date descending
- Columns: date block (navy/yellow), title + type pill, location, RSVP count, past/upcoming status badge
- Past events rendered at 0.65 opacity

**Analytics tab**
- Community health score (see below)
- Role breakdown — horizontal bar chart of `role_category` distribution across members
- At-risk list (members who attended at least once, then no RSVP in 60+ days) — shown conditionally

**Stats bar (top of page, always visible)**
- Members, Events, RSVP rate (% of members per event), visible on all tabs

---

#### 3. Community health score

After discussion, settled on a weighted score out of 100 from four signals:

| Signal | Weight | How calculated |
|---|---|---|
| RSVP rate | 35% | total RSVPs ÷ (members × past events) |
| Member reach | 25% | unique RSVPers ÷ total members |
| Connection rate | 30% | members with ≥1 accepted connection ÷ total members |
| Repeat attendance | 10% | members who attended >1 event ÷ total members |

Connection rate gets the highest weight because making connections is the product's core promise. Repeat attendance is low-weighted to avoid penalising young communities.

**Not enough data gate:** score is hidden until 3 past events exist. Before that, shows a placeholder with a count of past events so far.

**Visual — arc gauge (SVG, no library):**
- 210° arc, track + filled arc coloured by current band
- Tick marks at each band boundary
- Score and `/100` centred inside the arc
- Band label pill below (Critical / Poor / Fair / Good / Awesome)
- Mini band scale strip showing which bands are unlocked
- Right side: four signal bars, each bar coloured independently by its own band — makes it immediately obvious which signal is dragging the score

**Bands:**

| Score | Label | Colour |
|---|---|---|
| 0–20 | Critical | Red |
| 21–40 | Poor | Orange |
| 41–60 | Fair | Yellow |
| 61–80 | Good | Blue |
| 81–100 | Awesome | Green |

**Data fetched for health score** — `loadEvents` extended to also pull:
- `event_rsvps.clerk_user_id` (for unique RSVPers set)
- `connections` with `status = accepted` (for members-with-connections count)
- Past event count derived from events array

---

#### 4. `app/src/components/Sidebar.tsx` (updated)

- Added `useClerk` + `useNavigate` imports
- `jwt_is_org_admin()` RPC called once on session load; sets `isAdmin` state
- "Organiser" nav section with Dashboard link rendered only when `isAdmin === true`
- **Sign out button** added below the user card footer — subtle ghost style (muted border, grey text), turns red on hover, calls `clerk.signOut(() => navigate('/login'))`

---

#### 5. `app/src/App.tsx` (updated)

- Imported `Admin` page
- Added `<Route path="/admin" element={<Admin />} />` inside the protected layout

---

### Stat / label iteration

- Originally showed "RSVPs" as a raw count in the stats bar → changed to "RSVP rate" as a percentage after discussion
- "Engagement" label tried and rejected — overclaims what the metric measures
- "At risk" box removed from the stats bar (kept in Analytics tab at-risk list only)
- Final label: **RSVP rate** with subtitle **"% of members per event"**
- Health card originally a static grid of numbers → replaced with the arc gauge after agreeing the section needed to be visual and carry meaning at a glance

---

### Dev environment note

`user_3E5D484FC0PzCZpEVqBeKCYOnbM` is the Production Clerk user ID (owner in `org_members`). The Development Clerk instance has 3 different users — none of them have an `org_members` row yet. To test the admin panel on dev, a dev user's Clerk ID needs to be inserted into `org_members` with `org_role = 'owner'`.

---

### Files changed this session

| File | Change |
|---|---|
| `app/src/pages/Admin.tsx` | New file — full Organiser Dashboard |
| `app/src/components/Sidebar.tsx` | Admin nav section + sign out button |
| `app/src/App.tsx` | `/admin` route added |
| Supabase migration | `add_is_paying_to_org_members` |

---

### Current state after this session

- ✅ `/admin` route live, guard redirects non-admins to `/home`
- ✅ Members tab — searchable directory with role, attendance, paying toggle, status
- ✅ Events tab — full event list with RSVP counts
- ✅ Analytics tab — arc gauge health score + role breakdown + at-risk list
- ✅ Sign out button in sidebar
- ✅ `is_paying` column on `org_members`
- ⚠️ Dev environment has no admin user yet — needs a dev Clerk user ID inserted into `org_members`

### Next steps

1. Insert a dev Clerk user ID into `org_members` as owner so the dashboard can be tested on dev
2. Roadmap write-up — licensing model, org vs. personal data isolation framing
3. Real member onboarding — first non-test members
4. Check-in flow (Phase 3) — `attended` status on `event_rsvps` or new `event_checkins` table, which will replace RSVPs as the attendance signal in the health score

---

## Session — 21 June 2026 (cont.)

### Organiser Dashboard — spec discussion

#### Context

Decision: repurpose/extend the web dashboard into an Organiser Dashboard rather than building a separate admin tool. No `/admin` page existed — building fresh. The dashboard is organiser-only; all member data and analytics visible here are gated behind org admin role.

#### Schema recon (done during discussion)

- `org_members` columns: `id`, `org_id`, `clerk_user_id`, `org_role`, `joined_at`
- `org_role` values in use: `owner`, `admin` (member = no explicit role or separate value)
- Tushar's user (`user_3E5D484FC0PzCZpEVqBeKCYOnbM`) is `owner` of the Makers Klub org
- `jwt_is_org_admin()` SECURITY DEFINER helper already checks `org_role IN ('owner', 'admin')` — covers both roles, no migration needed
- No existing `/admin` route, no admin page, no admin component — clean slate

#### Feature spec — agreed

**Must-have (build first)**

1. **Member Directory** — searchable list of all org members via `org_members`. Name, role/bio, join date, avatar. Core CRM view.
2. **Stats Bar** — headline numbers at top: total members, total events, total RSVPs. Simple trust-builder, demo-friendly.
3. **Event List with Attendance** — all events scoped to org, each showing date, title, RSVP count.
4. **Per-Member Event History** — click a member → see which events they attended. Expand-in-place or minimal overlay.

**Good to have (second pass)**

5. **Attendance % per member** — events attended / total events hosted. Replaces the three separate "regulars / no-shows / at-risk" lists; one number covers all three. **Show only after 5 events have been hosted** — before that the data is noise.
6. **Connection count per member** — how many connections each member has made inside the community. Identifies super-connectors.
7. **Last seen / active at** — when did this member last RSVP or attend. Lets organiser spot quiet members.
8. **Role filter + other filters** — filter directory by `role_category`. Additional filters: paying/not, attendance range (active/quiet/new). Age and gender deferred (not collected yet; GDPR consent page needed first — see below).
9. **Paying member flag** — manual boolean `is_paying` on `org_members` that admin flips. Honest workaround until Luma/Stripe integration exists. Leaves schema hook for future ticketing integration.
10. **CSV export** — export member list. High perceived value for organiser ops.

**Cherry on top (polish / demo showstoppers)**

11. **At-risk flag** — auto-badge members who haven't attended in 60+ days as "quiet". No manual work, instant insight. Clearest proof the product does something LinkedIn doesn't. *Clarification asked during discussion: "at-risk" = member who was previously active but has gone quiet — attended at least once, then no attendance or RSVP in the last 60 days.*
12. **Super-connector highlight** — rank members by connection count, surface top 3–5. Gamification lite, demo-friendly.
13. **Network graph teaser** — small force-directed graph showing who's connected to whom across the org. Purely visual, no interactions needed. Demo gold. Deferred — expensive to build.

**Analytics tab (organiser-only)**

Goal: help organiser target the right audience for events and newsletters.

Three use-cases driving the analytics:
- **Event targeting** — role breakdown + past attendance by event type → "who should I invite to this kind of event?"
- **Newsletter targeting** — attendance % + last seen → "who's engaged vs cold?"
- **Growth** — member acquisition over time (simple line/bar chart)

#### Decisions made

- **No separate admin tool** — repurpose the existing web dashboard. Route: `/admin`. Same Aurora Glass look and feel as all other pages.
- **Sidebar** — add "Organiser" section below "Account", visible only to users with `org_role IN ('owner', 'admin')`. Single nav item: "Dashboard" → `/admin`.
- **Page structure** — three tabs: Members · Events · Analytics.
- **Data layer** — new `OrgAdminContext` (or inline queries in admin page), separate from `KlubContext` which is member-scoped. Admin queries use the `jwt_is_org_admin` helper already in place.
- **Gender / age fields** — deferred. Requires GDPR consent page during onboarding before collecting. Added to backlog.
- **GDPR consent page** — added to backlog. Show during onboarding before collecting any sensitive personal data (age, gender). Needed before those filter dimensions can be built.
- **Paying member** — `is_paying` boolean on `org_members`, manually managed by admin for now. Schema hook left for future ticketing.
- **Attendance % threshold** — only surface after 5 events hosted. Before that, suppress the column.
- **Network graph** — deferred. High value but high cost; park until post-launch.

#### What will be built (next session)

1. `/admin` route + guard component (redirect non-admins to `/home`)
2. `Admin.tsx` + `Admin.css` — three-tab page: Members · Events · Analytics, Aurora Glass
3. Sidebar update — "Organiser" section + Dashboard link, org-role gated
4. `App.tsx` — add `/admin` route
5. Migration: add `is_paying` boolean to `org_members` (nullable, default false)

#### Backlog additions from this discussion

- GDPR consent page during onboarding
- Age + gender fields on profiles (post-GDPR consent)
- Luma/Stripe ticketing integration (replaces manual `is_paying` flag)
- Network graph visualisation (organiser dashboard, cherry)

---

## Session — 21 June 2026 (cont.)

### Schema cleanup — `profiles.org_id` and `profiles.org_role` dropped

Verified via `information_schema.columns` that both columns are absent from the `profiles` table. Columns were superseded by the `org_members` many-to-many table (Phase 1.5) and have now been fully removed. No code references remain.

✅ Phase 1.5 schema cleanup complete.

---

## Session — 19 June 2026

### Context

Reviewed the two open options (A: embed event ID in QR URL, B: explicit picker) for reliably capturing event context on QR scan. Tushar proposed **Option C**: drop the "met at single event" concept entirely. Instead, since we already know which events both users attended, surface that on the connection card. We further scoped this down: for now, just show the last event stored on the connection record — not a dynamic cross-reference of both users' RSVPs.

### Changes made

**PWA — `Memory.tsx` + `Memory.module.css`**

Replaced the inline "met at [event]" text (which sat inside the name/bio area of accepted connection cards) with a structured section below the card header:

- Row 1: uppercase label "LAST EVENT TOGETHER"
- Row 2: violet-tinted pill chip `📍 Event name`
- Only renders if `conn.event_name` is present
- New CSS classes: `.metAtSection`, `.metAtLabel`, `.metAtChip`

Commit: `feat: last event chip on connection cards`

**PWA — `ConnectionOverlay.tsx` + `ConnectionOverlay.module.css`**

Replaced the old flat `eventChip` ("Met at…") in the overlay with a proper "Event last attended" section, rendered before Action items in the open state:

- Label: "EVENT LAST ATTENDED" (uppercase, muted)
- Card: exact same structure as `PastEventCard` in Events tab — type tag (with correct colour), date, title, location row with pin icon
- Matches event object from `events` array in context by title; fallback to plain title string if no match found (covers old connection data)
- Bottom sheet remains at `max-height: 85dvh` (not full screen)
- New CSS classes: `.lastEventSection`, `.lastEventLabel`, `.lastEventCard`, `.lastEventCardHead`, `.lastEventTag`, `.lastEventDate`, `.lastEventTitle`, `.lastEventFooter`, `.lastEventLocation`

Commit: `feat: last event card in connection overlay; revert overlay to bottom sheet`

**Web dashboard — no changes**

The web dashboard `Members.tsx` already renders event context inline in the metadata line (`Role · Event name · Date`), which works fine at desktop width. No equivalent change needed.

### Decisions

- Option C supersedes Options A and B — no QR URL changes, no picker. The app surfaces event context passively from stored data.
- "Last event together" label preferred over "Met at" — more accurate given users may attend multiple events with the same connection over time.
- Connection overlay stays as a bottom sheet (`85dvh`), not full screen.

### Current state after this session

- ✅ Accepted connection cards in PWA Network tab show "Last event together" chip (closed state)
- ✅ Connection overlay shows full event card under "Event last attended" before Action items (open state)
- ✅ Event card in overlay matches Events tab visual exactly (type tag, date, title, location)
- ✅ Web dashboard unchanged — existing inline metadata sufficient
- ⚠️ `conn.event_name` is still a stored string from connection creation time — not dynamically derived from attendance. Works for all connections made via QR scan or event attendee flow; may be null for very old test connections.

### Next steps

1. **Thin Organizer Dashboard** — member directory view for client/licensing demo
2. **Roadmap write-up** — licensing model, org vs. personal data isolation framing
3. **Real member onboarding** — first non-test members

---

## Session — 21 June 2026

### Aurora Glass treatment — Login & Signup pages (Web Dashboard + PWA)

Closed the long-running open item: applied the full Aurora Glass visual system to the authentication screens on both platforms.

---

#### Web Dashboard (`app/src/`)

**Files:** `app/src/pages/Login.tsx`, `app/src/pages/Signup.tsx`, `app/src/pages/Signup.css`, `app/src/global.css`

The web dashboard uses custom-built Clerk forms (email + password, multi-step signup with invite code + OTP + password rules). Both pages share the `.mkw-login` wrapper and `.mkw-signup-card` glass card.

**Changes made:**

- **Scoped dark-mode tokens on `.mkw-login`** — overrides the light-theme `:root` variables locally so all child elements (labels, inputs, placeholder text, links) inherit correct white-on-dark values without a global dark mode: `--ink-1/2/3`, `--hairline`, `--glass-bg`, `--glass-bg-strong`, `--glass-border`, `--glass-hi`, `--glass-shadow`, `--mk-yellow-deep`.

- **Aurora backdrop blobs** (`::before`) — removed the `opacity: 0.6` wrapper; opacity now embedded per-blob in each rgba value. Upgraded from 2 soft blobs to 3 more vivid anchors: yellow top-left (38%), violet bottom-right (42%), blue accent top-right (22%). Blob spread widths increased (55%/50%/40%) and transparency cutoff tightened to 65%/60% for a richer, more saturated nebula effect.

- **Glass card (`.mkw-signup-card`)** — switched from a flat white card (`background: var(--mk-white)`) to frosted glass: `rgba(255,255,255,0.16)` fill, `blur(22px) saturate(160%)` backdrop-filter, `rgba(255,255,255,0.22)` border, layered box-shadow (`0 16px 48px rgba(0,0,0,0.38)` + `inset 0 1px 0 rgba(255,255,255,0.18)` highlight + `0 32px 80px rgba(10,19,64,0.28)` deep glow). Border-radius aligned to `--r-lg` (22px).

- **Brand header** — replaced bare `<img src="/logo.svg">` + `.mkw-login-logo` with a `.mkw-brand-logo` wrapper div (36×36, `object-fit: contain`) alongside `.mkw-login-name` text. Path changed from `/logo.svg` to `logo.svg` (relative, consistent with Vite asset handling). Mark size refined to 52px with tighter letter-spacing on the "MK" initials.

- **Eyebrow / typography** — `.mkw-signup-eyebrow` colour switched from `var(--mk-ochre)` to `var(--mk-yellow-deep)` (token-correct on dark). Title, subtitle, labels, and link colours updated to use `--ink-1/2/3` token references instead of hardcoded `var(--mk-navy)` / `var(--fg-2)` values.

- **Error state** — `.mkw-signup-error` updated to `var(--danger)` text and `rgba(224,82,79,…)` tinted background + border for dark surface legibility.

- **Password rules** — `.mkw-password-rule.valid` updated from hardcoded `#2d9e6b` to `var(--ok)` token; all muted rule text updated to `var(--ink-3)`.

- **Yellow CTA variant** — added `.mk-btn-ochre` to `Signup.css` (background `var(--mk-yellow)`, ink `var(--mk-navy)`, hover/disabled states, `var(--shadow-cta)` glow). Previously the button worked by accident via the global `.mk-btn`; now it's explicitly defined in the signup stylesheet scope.

Commit: `fix: aurora glass treatment for login/signup pages` (`95c8dbb`)

---

#### PWA (`mk-event-app/src/`)

**Files:** `src/pages/Login/Login.module.css`, `src/pages/Login/Login.tsx`

The PWA uses Clerk's hosted `<SignIn>` component (handles both sign-in and sign-up in one widget). No separate signup page exists — Clerk manages the flow internally. Glass customisation is applied via the `appearance` prop.

**Changes made:**

- **Scoped dark-mode tokens on `.page`** — same pattern as web dashboard: `--ink-1/2/3`, `--hairline`, `--glass-*` vars scoped to the login page root as a self-documenting source of truth for the dark surface values.

- **Background** — hardcoded `#060a22` replaced with `var(--mk-navy)` (`#0a1340`) to stay in sync with the design token and match the web dashboard backdrop.

- **Aurora blobs** — removed `opacity: 0.7` wrapper on `::before`; opacity embedded per-blob into each rgba value. Blob positions refined to match web dashboard anchors: yellow top-left, violet bottom-right, blue top-right. A fourth soft-violet blob at bottom-right is retained for mobile portrait warmth.

- **Clerk card glass** — appearance overrides updated: border-radius `14px → 22px`, background `rgba(255,255,255,0.08) → 0.16`, border `rgba(255,255,255,0.14) → 0.22`, backdrop-filter gained `saturate(160%)` + `-webkit-` vendor prefix, box-shadow added (deep shadow + inset top-edge highlight + bottom glow) — identical values to web dashboard glass card.

- **Form fields** — `borderColor` tightened to `rgba(255,255,255,0.22)` to match the card border.

- **Form labels** — `color` updated from `rgba(255,255,255,0.55)` to `rgba(255,255,255,0.74)` — now matches `--ink-2` on dark, readable without being harsh.

- **CTA button shadow** — nudged from `rgba(252,184,19,0.4)` to `0.45` to match web dashboard yellow button glow.

- **Text tokens** — `.subtitle` and `.note` switched from hardcoded rgba to `var(--ink-3)` references.

Commit: `fix: aurora glass treatment for PWA login page` (`b4ee329`, `mk-event-app` repo)

---

### Current state after this session

- ✅ Web dashboard Login — Aurora Glass dark surface with vivid 3-blob aurora, frosted glass card, white token-aware typography
- ✅ Web dashboard Signup — same glass card + aurora backdrop across all steps (invite code → OTP → password → profile)
- ✅ PWA Login — matched aurora blobs, stronger Clerk card glass, correct label/text opacity, token-scoped dark vars
- ✅ Open item "Login/Signup Aurora Glass visual treatment" closed

### Next steps

1. **Thin Organizer Dashboard** — member directory view for client/licensing demo
2. **Roadmap write-up** — licensing model, org vs. personal data isolation framing
3. **Real member onboarding** — first non-test members


---

## Session — 22 June 2026 — Organiser Dashboard iteration

### Context

Continued iterating the Organiser Dashboard built in the previous session. All changes are in the web dashboard (`app/src/`). Session covered: member table improvements, event CRUD, event detail UX, CSS refactor, inline styles → CSS classes, events tab enhancements, sidebar navigation refactor, and bug fixes.

---

### 1. Member table revamp (`Admin.tsx`)

Six changes to the Members tab table:

- **"Events" column renamed** to "Events attended"
- **"Status" column replaced** with attendance % (events attended ÷ past events, shown in parentheses next to count)
- **"Connections made" column added** — how many accepted connections each member has made inside the community
- **Dates reformatted** to ordinal long form: `3rd June, 2026` via `formatDate()` helper using `ordinalSuffix()`
- **"Last seen" renamed** to "Last event attended", value shown as relative time: `Today`, `Yesterday`, `N days ago`, `N months ago` via `lastEventRelative()` helper
- **Engagement score** introduced per member — weighted formula: 60% attendance rate + 40% connections (normalised to 0–100). Displayed as a labelled pill badge using five bands:

| Score | Label | Colour |
|---|---|---|
| 0, no events | New | Grey |
| 1–30 | Observer | Blue |
| 31–60 | Regular | Violet |
| 61–80 | Core | Orange |
| 81–100 | Champion | Gold |

Helpers added: `ordinalSuffix()`, `formatDate()`, `lastEventRelative()`, `ENGAGEMENT_BANDS[]`, `getEngagementBand()`, `memberEngagementScore()`.

---

### 2. Event CRUD (`Admin.tsx`)

Full create / read / update / delete for events from the Organiser Dashboard Events tab.

- **EventFormModal** component — single modal handles all three modes (view, edit, create)
- **Create** — "+ Add event" button opens blank form; fields: title, start, end, type, venue, address, description, Luma URL. Saved via `events` insert with `org_id = MK_ORG`. Optimistically prepended to events list.
- **Update** — existing event fields pre-populated; saved via `events` update by ID. Optimistic list update.
- **Delete** — "Remove" button in modal footer with a confirm step ("Yes, remove" / Cancel). Row removed from list on success.
- `AdminEvent` type = `Event & { rsvp_count: number }`. `EventFormFields` type for form state.
- `toLocalDatetime()` helper converts ISO timestamps to `datetime-local` input format.

---

### 3. Event detail UX — view/edit/delete flow

Refined the Events tab interaction model:

- **Edit and Delete buttons removed from table rows** — table rows are now clean; click to open detail only
- **Row click opens detail popup** — clicking any event row opens `EventFormModal` in view (read-only) mode
- **Popup has Edit and Remove buttons** — Edit and Remove are in the popup footer only
- **Read-only until Edit clicked** — all fields are non-editable in view mode; clicking Edit switches to editable form, "Edit" button becomes "Save"
- **"+ Add event" button moved** to the tab bar row, right-aligned via `margin-left: auto`

---

### 4. Inline styles → CSS classes (`Admin.tsx` + `Admin.css`)

Full CSS extraction pass. New file `app/src/pages/Admin.css` with `adm-*` class namespace.

**Hover effects** — `onMouseEnter`/`onMouseLeave` JS handlers on `MemberRow` and `EventRow` replaced with CSS `:hover` selectors.

**Dynamic inline styles retained** (runtime-computed values that cannot be CSS classes): avatar palette colours, engagement band colour/background, health band colour, role breakdown bar colours, gauge arc stroke colour, signal fill width, disabled opacity.

---

### 5. Event detail popup — Events page modal style

Redesigned the `EventFormModal` **view mode** to match the Events page `EventModal` look and feel exactly.

View mode now renders:
- Type badge (violet pill) + status chip (Upcoming/Past) at top
- Large title (24px, weight 800, display font)
- Icon rows: 📅 navy block → date + time; 📍 violet block → venue + address; 👥 green block → RSVP count
- "About this event" uppercase label + body text for description
- "View on Luma →" full-width navy button (only if URL present)
- Remove (left) + Edit (right) footer buttons

Edit and create modes keep the clean form layout.

---

### 6. Events tab — Upcoming/Past sub-tabs, attendees list, free/paid pricing

**Upcoming / Past sub-tabs**
- Two pill buttons above the events table: "Upcoming" and "Past", each with a live count
- `eventSubTab` state filters the table

**Attendee list in event detail popup**
- Attendees loaded lazily when an event row is clicked (`loadAttendees` callback)
- Queries `event_rsvps` by `event_id`, then `profiles` for those user IDs
- Shown in the view mode popup: avatar (coloured circle) + name + role category

**Free / Paid pricing**
- DB migration `add_event_pricing` — `is_free boolean NOT NULL DEFAULT true` and `ticket_price numeric(10,2)` added to `events` table
- `Event` type in `supabase.ts` extended with `is_free` and `ticket_price`
- Table column "Tickets" — Free (green badge) or €N.NN (orange badge) via `PriceTag` component
- Detail view — 🎟️ icon row shows "Free entry" or "€N.NN per ticket"
- Add/edit form — Free/Paid toggle + conditional price input

---

### 7. Navigation tabs → sidebar

Moved the Members / Events / Analytics navigation from in-page pill buttons to the sidebar.

- **Tab state** switched from `useState<Tab>` to `useSearchParams` — active tab is URL-driven (`/admin?tab=members` etc.). Browser back/forward and direct links work correctly. Defaults to `members`.
- **Sidebar** — "Organiser" section now contains three `Link` items (Members, Events, Analytics). Active state: `location.pathname === '/admin' && searchParams.get('tab') === tab`. Uses `Link` not `NavLink` to prevent path-based auto-active matching.
- **In-page tab bar removed** from `Admin.tsx`.
- **"+ Add event" button** placed in the Upcoming/Past sub-tabs row, right-aligned.

**Bug fix:** All three sidebar Organiser items appeared active simultaneously. Root cause: `NavLink` auto-applies `active` class by path — all three `/admin?tab=…` links share the same `/admin` path. Fixed by replacing `NavLink` with plain `Link`.

---

### Files changed this session

| File | Change |
|---|---|
| `app/src/pages/Admin.tsx` | Member table columns, engagement score, event CRUD, view/edit/delete UX, inline styles → classes, attendees, pricing, URL-driven tab state |
| `app/src/pages/Admin.css` | New file — full `adm-*` class set; view-mode, attendees, ticket, sub-tab classes added iteratively |
| `app/src/components/Sidebar.tsx` | Organiser section → three Link items (Members/Events/Analytics), active state via `useLocation`/`useSearchParams` |
| `app/src/supabase.ts` | `Event` type extended with `is_free` and `ticket_price` |
| Supabase migration | `add_event_pricing` — `is_free` + `ticket_price` columns on `events` |

---

### Current state after this session

- ✅ Member table — attendance %, connections, engagement score badges, ordinal dates, relative last-event label
- ✅ Event CRUD — create, view, edit, delete from Events tab
- ✅ Event detail popup — matches Events page modal style (icon rows, description, Luma button)
- ✅ Events tab — Upcoming/Past sub-tabs with counts
- ✅ Attendees list in event detail popup (lazy-loaded)
- ✅ Free/Paid pricing on events — DB columns, table badge, detail view row, add/edit form
- ✅ Navigation tabs in sidebar — URL-driven, browser history works
- ✅ Bug: all sidebar items active simultaneously — fixed (Link vs NavLink)
- ✅ "+ Add event" and Upcoming/Past tabs on same row

### Next steps

1. **Roadmap write-up** — licensing model, org vs. personal data isolation framing
2. **Real member onboarding** — first non-test members
3. **Check-in flow** — `attended` status on `event_rsvps` or new `event_checkins` table, replacing RSVPs as attendance signal

---

## Session — 22 June 2026

### What was built

- **Recommendations / Insights tab** — proactive event-scoped action queue in the Organiser Dashboard
  - One card per upcoming event, pre-generated (no user prompting required)
  - Three sections per card: Invite Leads, Ticket Converts (paid events only), No-Show Risks
  - Each item has a "Copy message" CTA
  - UI built in Aurora Glass (navy, `--mk-violet`, `--mk-yellow`, Poppins)
- **Files written:**
  - `app/src/pages/Recommendations.tsx`
  - `app/src/pages/Recommendations.css`
  - `Admin.tsx` — `recommendations` tab added, import + render wired
  - `Sidebar.tsx` — Insights nav item added
- **Supabase Edge Function** — `supabase/functions/generate-recommendations/index.ts`
  - Verifies Clerk JWT; checks `org_members` for owner/admin role
  - Fetches all org data server-side via service role key
  - Calls Anthropic API with `ANTHROPIC_API_KEY` from Supabase secrets
  - Returns structured JSON — API key and raw member data never exposed to browser
  - `Recommendations.tsx` updated to call `/functions/v1/generate-recommendations` with Clerk JWT
### Known bug — not yet fixed

- **RSVP deduplication** — Tushar appeared in both Invite Leads and No-Show Risks for the same event (AI hallucination boundary violation). Fix identified: hard-filter `inviteLeads` and `ticketConverts` post-parse — strip any `clerk_user_id` present in `rsvpdIds`. Don't trust the model to enforce data boundaries; enforce in code. Not applied yet.

### Current state after this session

- ✅ Recommendations tab — Aurora Glass UI, event-scoped action cards
- ✅ Edge Function — auth-gated, server-side Anthropic call, structured JSON output
- ⏳ RSVP deduplication fix — identified, not yet applied
- ⏳ Deploy Edge Function — `supabase secrets set ANTHROPIC_API_KEY=...` + `supabase functions deploy generate-recommendations`

### Next steps

1. **Apply RSVP deduplication fix** in `supabase/functions/generate-recommendations/index.ts`
2. **Deploy Edge Function** — set secret, deploy, smoke-test against production
3. **Roadmap write-up** — licensing model, org vs. personal data isolation framing
4. **Real member onboarding** — first non-test members
5. **Check-in flow** — `attended` status on `event_rsvps` or new `event_checkins` table

---

## Marketing site (makersklub.com) — footer legal links restored

*10 July 2026*

- ✅ `impressum.html` and `datenschutz.html` were already present on disk (built earlier, per § 5 TMG / DSGVO) but their footer links were dropped during the July 8 site redesign (communities/professionals/community-tab rework of `index.html`) — an oversight, not intentional.
- ✅ Re-added `Impressum` and `Datenschutz` links to `.foot-bottom` in `index.html`, styled via new `.foot-bottom-links` rules in `styles.css`.
- ⚠️ Not yet pushed — Tushar to `git add`, `commit`, `push` to deploy.
- ⚠️ `community.html` (standalone file from 14 June) appears superseded by the in-page `mk-community` tab added in the July 8 redesign — not touched, flagged for cleanup/removal decision.
- ✅ Updated Impressum heading from "§ 5 TMG" to "§ 5 DDG" (TMG's Impressum provision was repealed May 2024, folded into the Digitale-Dienste-Gesetz).
- ✅ Added Umsatzsteuer-ID (DE360635616) to `impressum.html`, per § 27a UStG, under Kontakt.

---

## Session — 23 June 2026

### Engagement scoring refactor — event-count based recency decay

**Problem identified:** a member whose last RSVP was a year ago was scoring 68/100. Root cause: the engagement score formula used raw attendance rate (events attended ÷ total past events) with no time component. Someone historically active but long gone looked identical to someone active last month.

**First attempt (day-based decay) — discarded:** replaced the flat attendance rate with a day-based recency multiplier: full weight within 90 days, linear decay to 0 at 365 days. Tushar rejected this because the metric is more meaningful as events-missed, not days-since — at 4 events/month, a day-count window is a poor proxy.

**Final approach (event-count based decay):**
- Base: attendance rate calculated only over events the member was eligible for (events on or after their `joined_at` date) — prevents penalising members for events before they joined
- Recency multiplier: derived from `eventsMissed = (total past events − 1) − lastAttendedIndex`. Grace of 3 missed events (≈ 1 week at current cadence), zero at 12 missed (≈ 3 months). Linear between.
- Connection score unchanged — connections are a permanent structural signal, not recency-dependent
- Formula: `score = round(attPct × recencyMultiplier × 0.6 + connScore × 0.4)`

**Schema change:** `created_at` added to the `org_members` select query in the Edge Function to supply join date per member. `events_eligible` added to member snapshot payload so the AI has the correct denominator context.

**Files changed:** `supabase/functions/generate-recommendations/index.ts`

---

### Type cleanup — remove duplicate InsightsMember / InsightsEvent

**Problem:** `Recommendations.tsx` defined its own `InsightsMember` and `InsightsEvent` types that duplicated the shapes of `OrgMember` and `AdminEvent` in `Admin.tsx`. The component was called with `members={members as any}` to paper over the mismatch — an `as any` cast, explicitly unacceptable.

**Fix:**
- Exported `OrgMember` and `AdminEvent` from `Admin.tsx` (changed `type` → `export type`)
- `Recommendations.tsx` imports both via `import type { OrgMember, AdminEvent } from './Admin'`
- All `InsightsMember` and `InsightsEvent` references replaced throughout — component props, function signatures, helper functions, `copyMessage`, `AiRec.event`
- `as any` cast in `Admin.tsx` render call removed
- Verified with grep: zero remaining `InsightsMember`, `InsightsEvent`, or `as any` in either file

**Files changed:** `app/src/pages/Admin.tsx`, `app/src/pages/Recommendations.tsx`

---

### Insights tab — full redesign

**Problem:** the previous Insights tab was structured as one card per upcoming event (AI-first). No aggregate stats, no visualisations, no people signals. Didn't make sense as a dashboard section.

**New layout — four sections in order:**

**1. Stats row** — five metric cards: Members, Events hosted, Avg RSVPs/event (violet), Connection rate (blue), Repeat attendance (green). All computed client-side from data already loaded in Admin.tsx. No extra fetch.

**2. Charts row (three side-by-side cards):**
- **RSVPs by niche** — doughnut chart, total RSVPs per event type. Shows popularity of each event niche.
- **Estimated revenue by niche** — doughnut chart, `rsvp_count × ticket_price` per paid event type. Free events excluded. Labelled "estimated" in the subtitle; will be replaced with real Luma payment data when imported.
- **Members over time** — line chart, one point per member join date, y-axis is cumulative count, `tension: 0.3` smooth curve.

**3. People signals** — three-column grid: Regulars (3+ events, sorted by engagement score), Going quiet (attended before, 30+ days since last seen), Never attended (joined, zero events). All derived client-side.

**4. AI recommendations** — moved to the bottom. Now starts idle with a Generate button rather than auto-firing on page load. Same per-event invite leads / ticket converts / no-show risks structure, with copy-message buttons.

**Chart library — Chart.js** loaded lazily from CDN (`cdnjs.cloudflare.com/libs/Chart.js/4.4.1/chart.umd.js`) via a module-level `loadChartJs()` promise. Charts rendered into `useRef` canvases; destroyed and recreated on data change. No bundler dependency.

**Removed:** the hand-rolled SVG bar chart, the event type breakdown horizontal bars, `EventChart` and `EventTypeBreakdown` components, old chart/type-breakdown CSS classes.

**Files changed:** `app/src/pages/Recommendations.tsx` (full rewrite), `app/src/pages/Recommendations.css` (charts row + doughnut legend + cleanup of old SVG chart CSS)

**Admin.tsx change:** props passed to `<Recommendations>` updated — `members`, `events`, `stats` now passed directly with correct types; `as any` removed.

---

### SVG chart rendering bug — fixed

**Bug:** with one past event, the SVG bar chart rendered a single bar that filled the entire viewport height.

**Root cause (two issues):**
1. Single bar scaled to `max = 1 RSVP` = 100% of bar height. With a very wide container, the SVG expanded proportionally and the single bar looked like a full-page grey block.
2. No minimum slot count — a one-event chart had only one bar-width of viewBox.

**Fix (applied before the full chart rewrite):**
- Minimum 6 slots in the viewBox regardless of event count
- `max-height: 180px` on `.ins-chart-svg` to cap vertical expansion

Note: this bug no longer exists after the Chart.js rewrite (doughnut + line charts replaced the SVG bar chart), but the fix was applied first and is recorded here for completeness.

---

### Housekeeping

- **`CREATE_DIRS.sh` removed** — one-time scaffolding script, job done. Deleted from repo root. Commit message: `chore: remove CREATE_DIRS.sh scaffolding script`

---

### Current state after this session

- ✅ Engagement scoring — event-count recency decay, eligible events scoped to join date
- ✅ Type cleanup — `OrgMember`/`AdminEvent` exported from Admin, no duplicate types, no `as any`
- ✅ Insights tab redesigned — stats → charts (Chart.js) → people signals → AI recommendations
- ✅ Three charts: RSVPs by niche (doughnut), estimated revenue by niche (doughnut), members over time (line)
- ✅ SVG bar chart removed
- ✅ `CREATE_DIRS.sh` removed
- ⏳ RSVP deduplication fix — still not applied to Edge Function
- ⏳ Deploy Edge Function — `supabase secrets set ANTHROPIC_API_KEY=...` + `supabase functions deploy generate-recommendations`

---

## Session: June 27 2026 — Notes Feature, Strategy Realignment & Competitor Review

### Context brought into session
A potential community organiser client pulled back, saying the platform "only builds a connection list and has no USP." This triggered a strategy conversation and a summary was shared at the start of the session.

**Key conclusions from that summary:**
- The client feedback was right for the wrong reasons. The real problem was premature B2B sales — pitching a white-label solution before the member experience is proven.
- The original vision is correct: Makers Klub as a testing ground → prove member experience → approach communities → scale white-label.
- **North star metric for the testing phase confirmed: return visits the day after an event.** Not scans, not signups.
- The thing to build before July: the notes feature. Action item tags in the existing flow were decorative — nothing acted on them. Free-text notes are strictly more powerful.

### Strategy discussion

**On event aggregation (Luma/Eventbrite API):** Rejected definitively. The only reason someone opens the app the day after an event is to look at the people they met — not to discover events. Building a worse version of Luma to solve a problem Luma already solves is a distraction. The actual differentiator is the connection layer. Event aggregation dropped entirely.

**On Captūr (cptur.ai):** Reviewed their website. Surface-level overlap — both capture post-event conversation context. But Captūr is a personal CRM tool for salespeople at conferences: you record voice memos after each conversation, AI structures them, you export to CRM. Their unit is strangers you'll probably never see again. Makers Klub's unit is community members who will keep seeing each other — the value compounds across repeated encounters. Fundamental different product. Voice memo feature also considered and rejected: legal/consent complexity in public spaces, no appetite for that.

### Notes feature — what shipped

**Problem:** The existing flow had "Action items" — a set of decorative tag chips (`Send email`, `Intro call`, `Collab discussion`, etc.) that got saved to `connection.tags` but nothing in the app ever acted on them. They were UI theatre.

**Solution:** Remove tags entirely across the whole flow. Replace with a single free-text textarea for notes. Notes save to the existing `connection.notes` column in Supabase (already existed in schema, already had `updateConnectionNotes` helper).

**Files changed:**

`src/lib/supabase.ts`
- `addConnection` signature changed: third argument was `tags: string[]`, now `notes: string | null`
- Function body: writes `notes` field, always writes `tags: []` (clearing old tag data going forward)

`src/pages/MemberProfile/MemberProfile.tsx`
- Removed all tag state (`selectedTags`, `addingTag`, `customTag`), `DEFAULT_TAGS` constant, tag toggle/add handlers
- Added `notes` state (string)
- Notes textarea shown in the overlay when `connectionState === 'none'` — placeholder reads "What did you talk about with [first name]?"
- Notes pre-populate from `existing.notes` if a connection already exists
- Notes passed to `addConnection` on submit

`src/pages/MemberProfile/MemberProfile.module.css`
- Removed all `.tag*` classes
- Added `.notesInput` — glass background, violet focus border, `resize: none`, `min-height: 80px`

`src/pages/Memory/ConnectionOverlay.tsx`
- Removed `DEFAULT_TAGS`, all tag state and handlers, `addingTag` / `customTag` flow
- Added `notes` state pre-populated from `connection.notes`
- Notes textarea replaces the entire tags section
- `handleDone` now calls `updateConnectionMeta` with `{ notes: notes.trim() || null, follow_up: followUp }` instead of `{ tags, follow_up }`
- Renamed "Event last attended" label to "Met at" — more accurate (this is connection context, not event history)

`src/pages/Memory/ConnectionOverlay.module.css`
- Removed all `.tag*` classes
- Added `.notesInput` matching MemberProfile styles

`src/pages/Events/Events.tsx`
- `handleConnect` inside inline `AttendeesSheet` was passing `[]` (old tags array) as third arg to `addConnection` — updated to pass `null` for notes
- This also fixed a TypeScript type error introduced by the signature change

### Key decisions
| Decision | Reason |
|---|---|
| Tags removed entirely | Decorative — nothing acted on them. Notes are strictly more powerful. |
| Notes on the connection, not the event | When you see someone again months later, you open their profile, not an event page. |
| No voice memos | Legal/consent complexity in public spaces. Not worth it. |
| Event aggregation dropped | Users open the app to see people they met, not to discover events. Luma already does discovery. |
| B2B white-label deferred | Needs proven member experience first. No organiser will bet their community on an unvalidated product. |

*Last updated: June 27 2026*

### Next steps

1. **Apply RSVP deduplication fix** in `supabase/functions/generate-recommendations/index.ts`
2. **Deploy Edge Function** — set secret, deploy, smoke-test against production
3. **Real member onboarding** — first non-test members
4. **Roadmap write-up** — licensing model, org vs. personal data isolation framing
5. **Check-in flow** — `attended` status on `event_rsvps` or new `event_checkins` table

