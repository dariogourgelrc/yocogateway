-- Adds Whop as a selectable payment provider alongside Stripe.
-- payment_provider on products decides which integration the checkout link uses.

alter table products
  add column if not exists payment_provider text not null default 'stripe'
    check (payment_provider in ('stripe', 'whop')),
  add column if not exists whop_api_key text,
  add column if not exists whop_company_id text,
  add column if not exists whop_webhook_secret text;

alter table user_settings
  add column if not exists whop_api_key text not null default '',
  add column if not exists whop_company_id text not null default '',
  add column if not exists whop_webhook_secret text not null default '';
