-- In-app registration for Makers Klub events (free events first).
-- Capacity and waitlist are enforced in the database so clients cannot bypass them.

-- ── events: columns the Admin form and web app already assume, plus capacity ──
alter table public.events
  add column if not exists is_free           boolean not null default true,
  add column if not exists ticket_price      numeric,
  add column if not exists capacity          integer check (capacity is null or capacity > 0),
  add column if not exists registration_mode text    not null default 'in_app'
    check (registration_mode in ('in_app', 'external'));

-- The Admin form offers Networking / Workshop / Social / Panel / ... so the old
-- four-value check rejects most of what an admin can pick.
alter table public.events drop constraint if exists events_type_check;

-- ── event_rsvps: waitlist status ──
alter table public.event_rsvps drop constraint if exists event_rsvps_status_check;
alter table public.event_rsvps
  add constraint event_rsvps_status_check check (status in ('going', 'interested', 'waitlist'));

create index if not exists event_rsvps_event_status_idx on public.event_rsvps (event_id, status, created_at);

-- ── capacity enforcement ──
-- Runs on insert, and on update when a row moves into 'going'. The event row is locked so
-- two people taking the last spot cannot both get it.
create or replace function public.event_rsvps_apply_capacity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cap   integer;
  taken integer;
begin
  if tg_op = 'UPDATE' then
    if new.clerk_user_id <> old.clerk_user_id or new.event_id <> old.event_id then
      raise exception 'rsvp owner and event cannot be changed';
    end if;
    if new.status <> 'going' or old.status = 'going' then
      return new;
    end if;
  elsif new.status <> 'going' then
    return new;
  end if;

  select capacity into cap from public.events where id = new.event_id for update;
  if cap is null then
    return new;
  end if;

  select count(*) into taken from public.event_rsvps
   where event_id = new.event_id and status = 'going' and id is distinct from new.id;
  if taken >= cap then
    new.status := 'waitlist';
  end if;
  return new;
end $$;

create trigger event_rsvps_capacity
  before insert or update on public.event_rsvps
  for each row execute function public.event_rsvps_apply_capacity();

-- ── waitlist promotion ──
create or replace function public.promote_event_waitlist(p_event_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  cap   integer;
  taken integer;
begin
  select capacity into cap from public.events where id = p_event_id for update;
  if cap is null then
    update public.event_rsvps set status = 'going' where event_id = p_event_id and status = 'waitlist';
    return;
  end if;
  select count(*) into taken from public.event_rsvps where event_id = p_event_id and status = 'going';
  if taken < cap then
    update public.event_rsvps set status = 'going'
     where id in (
       select id from public.event_rsvps
        where event_id = p_event_id and status = 'waitlist'
        order by created_at
        limit cap - taken
     );
  end if;
end $$;

create or replace function public.event_rsvps_after_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'going' then
    perform public.promote_event_waitlist(old.event_id);
  end if;
  return old;
end $$;

create trigger event_rsvps_promote_on_cancel
  after delete on public.event_rsvps
  for each row execute function public.event_rsvps_after_cancel();

-- Admin raises (or removes) the capacity: let waiting people in.
create or replace function public.events_after_capacity_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.promote_event_waitlist(new.id);
  return new;
end $$;

create trigger events_promote_on_capacity_change
  after update of capacity on public.events
  for each row when (new.capacity is distinct from old.capacity)
  execute function public.events_after_capacity_change();

revoke execute on function public.promote_event_waitlist(uuid) from public, anon, authenticated;

-- ── events: writes are admin-only (previously any signed-in user) ──
drop policy if exists rls_events_insert_auth on public.events;
drop policy if exists rls_events_update_auth on public.events;
drop policy if exists rls_events_delete_auth on public.events;

create policy rls_events_admin_insert on public.events
  for insert with check ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));
create policy rls_events_admin_update on public.events
  for update using ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));
create policy rls_events_admin_delete on public.events
  for delete using ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));
