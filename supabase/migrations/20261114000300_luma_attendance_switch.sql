-- Show who attended past events, with a switch for naming Luma guests who are not app members.
-- Counts are always available. Names of non-member Luma guests are returned only when
-- app_settings.show_luma_attendees is true (turn it on once guests have consented), or to admins.

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;

create policy rls_app_settings_read on public.app_settings for select using (true);
create policy rls_app_settings_admin_write on public.app_settings for all
  using ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']))
  with check ((auth.jwt() ->> 'sub') = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']));

insert into public.app_settings (key, value) values ('show_luma_attendees', 'false'::jsonb)
  on conflict (key) do nothing;

-- { total, names, names_visible } for one event. total counts everyone who attended;
-- names lists attendees who are not app members (members are shown from event_rsvps).
create or replace function public.luma_event_attendance(p_event_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid      text := auth.jwt() ->> 'sub';
  is_admin boolean;
  show     boolean;
  lid      text;
  total    integer;
  names    jsonb;
begin
  if uid is null then
    return null;
  end if;
  is_admin := uid = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']);
  select coalesce((value)::boolean, false) into show from public.app_settings where key = 'show_luma_attendees';
  show := coalesce(show, false);

  select luma_event_id into lid from public.events where id = p_event_id;
  if lid is null then
    return jsonb_build_object('total', 0, 'names', null, 'names_visible', show or is_admin);
  end if;

  with att as (
    select c.person_key, max(c.name) as name, bool_or(p.clerk_user_id is not null) as on_app
      from public.luma_guest_registrations g
      join public.luma_contacts c on c.email = g.contact_email
      left join public.profiles p on lower(p.email) = c.email
     where g.luma_event_id = lid and g.is_registration and g.approval_status = 'approved'
       and (
         g.checked_in_at is not null
         or not exists (
           select 1 from public.luma_guest_registrations x
            where x.luma_event_id = lid and x.checked_in_at is not null
         )
       )
     group by c.person_key
  )
  select count(*),
         jsonb_agg(jsonb_build_object('name', coalesce(name, 'Guest')) order by name) filter (where not on_app)
    into total, names
    from att;

  if not (show or is_admin) then
    names := null;
  end if;
  return jsonb_build_object('total', total, 'names', names, 'names_visible', show or is_admin);
end $$;
