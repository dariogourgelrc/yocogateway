-- 001_initial_schema.sql

-- ============================================
-- EXTENSIONS
-- ============================================
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Products
create table products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  currency text not null default 'NAD',
  image_url text not null default '',
  delivery_url text not null default '',
  upsell_url text,
  back_redirect_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order bumps
create table order_bumps (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  image_url text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Product trackers
create table product_trackers (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  type text not null,               -- 'facebook', 'utmify', 'google_ads', 'tiktok'
  tracker_id text not null,          -- pixel ID or API token
  side text not null check (side in ('client', 'server')),
  config jsonb,                      -- tracker-specific (e.g. FB CAPI access_token, dataset_id)
  created_at timestamptz not null default now()
);

-- Orders
create table orders (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id),
  yoco_payment_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  total_amount integer not null check (total_amount >= 0),
  currency text not null,
  tracking_params jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items (snapshots)
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  type text not null check (type in ('product', 'order_bump')),
  reference_id uuid not null,
  name text not null,
  price integer not null check (price >= 0),
  created_at timestamptz not null default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_orders_yoco_payment_id on orders(yoco_payment_id);
create index idx_orders_product_id on orders(product_id);
create index idx_order_items_order_id on order_items(order_id);
create index idx_order_bumps_product_id on order_bumps(product_id);
create index idx_product_trackers_product_id on product_trackers(product_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table products enable row level security;
alter table order_bumps enable row level security;
alter table product_trackers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Products: public can read (for checkout pages), service role can write
create policy "products_public_read" on products
  for select using (true);

create policy "products_service_write" on products
  for all using (auth.role() = 'service_role');

-- Order bumps: public can read (displayed on checkout), service role can write
create policy "order_bumps_public_read" on order_bumps
  for select using (true);

create policy "order_bumps_service_write" on order_bumps
  for all using (auth.role() = 'service_role');

-- Product trackers: public can read (client-side trackers loaded on checkout), service role can write
create policy "product_trackers_public_read" on product_trackers
  for select using (true);

create policy "product_trackers_service_write" on product_trackers
  for all using (auth.role() = 'service_role');

-- Orders: service role only (created/updated by API routes and webhooks)
create policy "orders_service_only" on orders
  for all using (auth.role() = 'service_role');

-- Order items: service role only
create policy "order_items_service_only" on order_items
  for all using (auth.role() = 'service_role');

-- ============================================
-- STORAGE BUCKET
-- ============================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true);

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_service_upload" on storage.objects
  for insert with check (bucket_id = 'product-images');

create policy "product_images_service_delete" on storage.objects
  for delete using (bucket_id = 'product-images');
