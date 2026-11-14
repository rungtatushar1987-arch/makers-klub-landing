-- luma_event_attendance(): also return each non-member guest's role ("freelancer", ...) and a
-- cleaned profile link (LinkedIn preferred, else a website), under the same visibility rules
-- as the names (admins always, members only when app_settings.show_luma_attendees is on).

create or replace function public.luma_clean_link(t text) returns text
language sql immutable as $$
  select case when l is null then null
              when l ~* '^https?://' then l
              else 'https://' || l end
    from (
      select rtrim(coalesce(
        (regexp_match(t, '((?:https?://)?(?:[a-z]{2,3}\.|www\.)?linkedin\.com/[^\s]+)', 'i'))[1],
        (regexp_match(t, '((?:https?://)[^\s]+|(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:/[^\s]*)?)', 'i'))[1]
      ), '.,)') as l
    ) s
$$;

create or replace function public.luma_event_attendance(p_event_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid        text := auth.jwt() ->> 'sub';
  is_admin   boolean;
  show       boolean;
  lid        text;
  registered integer;
  checked_in integer;
  names      jsonb;
begin
  if uid is null then
    return null;
  end if;
  is_admin := uid = any (array['user_3E5D484FC0PzCZpEVqBeKCYOnbM', 'user_3HsXKj9IGkxDr41ZuZndhdJYqxi']);
  select coalesce((value)::boolean, false) into show from public.app_settings where key = 'show_luma_attendees';
  show := coalesce(show, false);

  select luma_event_id into lid from public.events where id = p_event_id;
  if lid is null then
    return jsonb_build_object('total', 0, 'registered', 0, 'checked_in', 0, 'names', null, 'names_visible', show or is_admin);
  end if;

  select count(distinct c.person_key),
         count(distinct c.person_key) filter (where g.checked_in_at is not null)
    into registered, checked_in
    from public.luma_guest_registrations g
    join public.luma_contacts c on c.email = g.contact_email
   where g.luma_event_id = lid and g.is_registration and g.approval_status = 'approved';

  with att as (
    select c.person_key,
           max(c.name) as name,
           max(g.role) as role,
           (array_agg(public.luma_clean_link(g.linkedin_url)
                      order by (g.linkedin_url ilike '%linkedin.com%') desc)
              filter (where public.luma_clean_link(g.linkedin_url) is not null))[1] as link,
           bool_or(p.clerk_user_id is not null) as on_app
      from public.luma_guest_registrations g
      join public.luma_contacts c on c.email = g.contact_email
      left join public.profiles p on lower(p.email) = c.email
     where g.luma_event_id = lid and g.is_registration and g.approval_status = 'approved'
       and (checked_in = 0 or g.checked_in_at is not null)
     group by c.person_key
  )
  select jsonb_agg(jsonb_build_object('name', coalesce(name, 'Guest'), 'role', role, 'link', link) order by name)
         filter (where not on_app)
    into names
    from att;

  if not (show or is_admin) then
    names := null;
  end if;
  return jsonb_build_object('total', registered, 'registered', registered, 'checked_in', checked_in,
                            'names', names, 'names_visible', show or is_admin);
end $$;
