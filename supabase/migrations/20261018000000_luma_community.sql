-- Luma community data, loaded into Supabase on request by Claude via the Luma connector.
-- Writes happen with the service role, which bypasses RLS.

create table public.luma_contacts (
  luma_user_id           text primary key,
  email                  text not null unique,   -- stored lowercased
  name                   text,
  first_name             text,
  last_name              text,
  revenue_usd_cents      integer not null default 0,
  event_approved_count   integer not null default 0,
  event_checked_in_count integer not null default 0,
  joined_at              timestamptz,
  membership_status      text,
  raw                    jsonb,
  synced_at              timestamptz not null default now()
);

create table public.luma_events (
  luma_event_id text primary key,
  name          text,
  start_at      timestamptz,
  end_at        timestamptz,
  timezone      text,
  location_type text,
  city          text,
  full_address  text,
  tags          text[] not null default '{}',
  period        text check (period in ('past', 'future')),
  synced_at     timestamptz not null default now()
);

create table public.luma_guest_registrations (
  id                       uuid primary key default gen_random_uuid(),
  luma_event_id            text not null references public.luma_events (luma_event_id) on delete cascade,
  contact_email            text not null references public.luma_contacts (email) on update cascade on delete cascade,
  approval_status          text,
  checked_in_at            timestamptz,
  registered_at            timestamptz,
  role                     text,
  linkedin_url             text,
  raw_registration_answers jsonb,
  ticket_amount_cents      integer,
  ticket_currency          text,
  synced_at                timestamptz not null default now(),
  unique (luma_event_id, contact_email)
);

create index luma_guest_registrations_email_idx on public.luma_guest_registrations (contact_email);

alter table public.luma_contacts            enable row level security;
alter table public.luma_events              enable row level security;
alter table public.luma_guest_registrations enable row level security;

create policy rls_luma_contacts_admin_read on public.luma_contacts
  for select using ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));
create policy rls_luma_events_admin_read on public.luma_events
  for select using ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));
create policy rls_luma_guest_registrations_admin_read on public.luma_guest_registrations
  for select using ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));

-- Tables created via SQL get default grants to anon/authenticated; RLS (no policy
-- for them besides admin SELECT) blocks everything else. Drop write grants anyway.
revoke insert, update, delete, truncate on public.luma_contacts, public.luma_events, public.luma_guest_registrations from anon, authenticated;
