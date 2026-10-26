-- Gross captured EUR ticket orders per guest, loaded from Luma's get_guest event_ticket_orders.
-- Matches how Luma's Payment page counts revenue: refunded orders stay in gross.
alter table public.luma_guest_registrations
  add column if not exists order_amount_cents integer,
  add column if not exists order_refunded_cents integer,
  add column if not exists order_currency text,
  add column if not exists order_count integer;
