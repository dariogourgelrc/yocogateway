-- Allow products to let buyers choose their own price at checkout.
-- The default preserves fixed-price behavior for all existing products.
alter table products
  add column if not exists pay_what_you_want boolean not null default false;
