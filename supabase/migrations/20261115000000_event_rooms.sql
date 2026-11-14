-- Event rooms: a feed around each event, open to registered members before and after it.
-- Posts are questions, intros and links; replies hang off a post via parent_id.
-- Access is enforced here, not in the app: only people registered (going or waitlist) for
-- the event, and organisers, can read or post.

create table if not exists public.event_posts (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  clerk_user_id text not null,
  kind          text not null check (kind in ('question', 'intro', 'link', 'reply')),
  body          text not null check (char_length(btrim(body)) between 1 and 2000),
  link_url      text check (link_url is null or (link_url ~* '^https?://' and char_length(link_url) <= 500)),
  parent_id     uuid references public.event_posts(id) on delete cascade,
  pinned        boolean not null default false,
  created_at    timestamptz not null default now(),
  -- replies need a parent; everything else must not have one
  constraint event_posts_parent_matches_kind check ((kind = 'reply') = (parent_id is not null))
);

create index if not exists event_posts_event_idx  on public.event_posts (event_id, created_at desc);
create index if not exists event_posts_parent_idx on public.event_posts (parent_id);

-- ── who may see and post ──
create or replace function public.is_event_room_member(p_event_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select
    (auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi'])
    or exists (
      select 1 from public.event_rsvps r
       where r.event_id = p_event_id
         and r.clerk_user_id = (auth.jwt() ->> 'sub')
         and r.status in ('going', 'waitlist')
    );
$$;

-- A reply must sit on a top-level post of the same event.
create or replace function public.event_posts_check_parent() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  if new.parent_id is null then
    return new;
  end if;
  select event_id, parent_id into p from public.event_posts where id = new.parent_id;
  if not found or p.event_id <> new.event_id or p.parent_id is not null then
    raise exception 'replies must be on a post in the same event';
  end if;
  return new;
end $$;

drop trigger if exists event_posts_parent_check on public.event_posts;
create trigger event_posts_parent_check
  before insert on public.event_posts
  for each row execute function public.event_posts_check_parent();

alter table public.event_posts enable row level security;

drop policy if exists event_posts_select on public.event_posts;
create policy event_posts_select on public.event_posts
  for select using (public.is_event_room_member(event_id));

drop policy if exists event_posts_insert on public.event_posts;
create policy event_posts_insert on public.event_posts
  for insert with check (
    clerk_user_id = (auth.jwt() ->> 'sub')
    and pinned = false
    and public.is_event_room_member(event_id)
  );

-- Pinning is for organisers only.
drop policy if exists event_posts_update_admin on public.event_posts;
create policy event_posts_update_admin on public.event_posts
  for update using ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));

-- Authors delete their own posts; organisers can delete any.
drop policy if exists event_posts_delete on public.event_posts;
create policy event_posts_delete on public.event_posts
  for delete using (
    clerk_user_id = (auth.jwt() ->> 'sub')
    or (auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi'])
  );

-- Trigger helper: not meant to be called through the API.
revoke execute on function public.event_posts_check_parent() from public, anon, authenticated;
