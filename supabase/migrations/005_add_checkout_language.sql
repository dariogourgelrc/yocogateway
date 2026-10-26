-- Add the default language used by each product's checkout.
alter table products
  add column if not exists checkout_language text not null default 'en';

alter table products
  drop constraint if exists products_checkout_language_check;

alter table products
  add constraint products_checkout_language_check
  check (checkout_language in ('en', 'pt'));
