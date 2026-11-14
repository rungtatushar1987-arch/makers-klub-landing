-- Link Luma attendance to members when they sign in, matched on their verified email.
-- The email is read from the Clerk session token claim `email` (add it under Clerk Dashboard →
-- Sessions → Customize session token: { "email": "{{user.primary_email_address}}" }).
-- Without that claim the function does nothing, so it cannot be spoofed from the browser.

alter table public.events add column if not exists luma_event_id text unique;

-- Map app events to Luma events by start time (titles differ slightly between the two).
update public.events e
   set luma_event_id = l.luma_event_id
  from public.luma_events l
 where e.luma_event_id is null and l.start_at = e.date;

alter table public.event_rsvps add column if not exists source text not null default 'app'
  check (source in ('app', 'luma'));

create or replace function public.claim_luma_attendance() returns integer
language plpgsql security definer set search_path = public as $$
declare
  uid      text := auth.jwt() ->> 'sub';
  em       text := lower(nullif(auth.jwt() ->> 'email', ''));
  pkey     text;
  inserted integer := 0;
begin
  if uid is null or em is null then
    return null;  -- not signed in, or the email claim is not configured: do nothing
  end if;

  update public.profiles set email = em where clerk_user_id = uid and (email is null or email = '');

  select person_key into pkey from public.luma_contacts where email = em;
  if pkey is null then
    return 0;
  end if;

  -- Approved guests count as attending. Where Luma recorded check-ins for an event, only
  -- people who checked in count.
  insert into public.event_rsvps (clerk_user_id, event_id, status, source)
  select distinct uid, e.id, 'going', 'luma'
    from public.luma_guest_registrations g
    join public.luma_contacts c on c.email = g.contact_email and c.person_key = pkey
    join public.events e on e.luma_event_id = g.luma_event_id
   where g.is_registration
     and g.approval_status = 'approved'
     and (
       g.checked_in_at is not null
       or not exists (
         select 1 from public.luma_guest_registrations x
          where x.luma_event_id = g.luma_event_id and x.checked_in_at is not null
       )
     )
  on conflict (clerk_user_id, event_id) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end $$;
-- Default execute grants stay: the Clerk token may reach PostgREST as anon, and the function
-- itself returns early unless the token carries a user id and a verified email.
