-- One person can register with several emails; person_key groups a person's contact rows.
-- Defaults to the contact's own email; people with several emails share the first one.
alter table public.luma_contacts add column if not exists person_key text;
update public.luma_contacts set person_key = email where person_key is null;
create index if not exists luma_contacts_person_key_idx on public.luma_contacts (person_key);
