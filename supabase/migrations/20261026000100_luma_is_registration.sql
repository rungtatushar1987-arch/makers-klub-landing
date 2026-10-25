-- Luma guest lists include everyone invited. A guest counts as a registration if they were
-- approved, waitlisted or pending, or were declined after filling in the registration form.
alter table public.luma_guest_registrations add column if not exists is_registration boolean generated always as (
  approval_status in ('approved','waitlist','pending_approval')
  or (approval_status = 'declined' and raw_registration_answers is not null and raw_registration_answers <> '[]'::jsonb)
) stored;
