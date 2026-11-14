-- Newsletter signups from the homepage form. Written only by the Vercel API routes
-- (api/newsletter-subscribe.js, api/newsletter-confirm.js) using the service role,
-- which bypasses RLS. RLS is on with no policies, so the anon key cannot read or write.

create table public.newsletter_subscribers (
  email         text primary key,                 -- stored lowercased
  status        text not null default 'pending' check (status in ('pending', 'confirmed')),
  token         uuid not null unique default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  last_sent_at  timestamptz,
  confirmed_at  timestamptz
);

alter table public.newsletter_subscribers enable row level security;
