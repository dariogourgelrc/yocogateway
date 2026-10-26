-- Allow products to use Spanish as their default checkout language.
alter table products
  drop constraint if exists products_checkout_language_check;

alter table products
  add constraint products_checkout_language_check
  check (checkout_language in ('en', 'pt', 'es'));