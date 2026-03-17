# Checkout Creator MVP — Architecture

Based on decisions made in [DESIGN.md](DESIGN.md). Nothing here overrides the design document.

---

## 1. Folder Structure

```
checkout-creator/
├── .env.local                          # Environment variables (gitignored)
├── .env.example                        # Template for env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Full schema: products, order_bumps, product_trackers, orders, order_items
│
├── public/
│   └── images/                         # Static assets (logo, fallback images)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (fonts, global styles)
│   │   ├── globals.css                 # Tailwind base styles
│   │   │
│   │   ├── admin/
│   │   │   ├── page.tsx                # GET /admin — product list
│   │   │   ├── create/
│   │   │   │   └── page.tsx            # GET /admin/create — create product form
│   │   │   └── [productId]/
│   │   │       └── edit/
│   │   │           └── page.tsx        # GET /admin/[productId]/edit — edit product form
│   │   │
│   │   ├── checkout/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx            # GET /checkout/[slug] — checkout page (Server Component, fetches product)
│   │   │       ├── success/
│   │   │       │   └── page.tsx        # GET /checkout/[slug]/success — default success page
│   │   │       └── cancel/
│   │   │           └── page.tsx        # GET /checkout/[slug]/cancel — abandonment redirect handler
│   │   │
│   │   └── api/
│   │       ├── products/
│   │       │   ├── route.ts            # POST /api/products — create product
│   │       │   └── [id]/
│   │       │       └── route.ts        # PUT, DELETE /api/products/[id]
│   │       ├── checkout/
│   │       │   └── [productId]/
│   │       │       └── route.ts        # POST /api/checkout/[productId] — create order + init Yoco session
│   │       ├── webhooks/
│   │       │   └── yoco/
│   │       │       └── route.ts        # POST /api/webhooks/yoco — payment confirmation
│   │       └── upload/
│   │           └── route.ts            # POST /api/upload — image upload to Supabase Storage
│   │
│   ├── components/
│   │   ├── ui/                         # Generic reusable UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── label.tsx
│   │   │   ├── card.tsx
│   │   │   ├── image-upload.tsx        # Drag-and-drop / click-to-upload component
│   │   │   └── currency-display.tsx    # Formats cents → "N$ 149.99" or "R 149.99"
│   │   │
│   │   ├── admin/
│   │   │   ├── product-form.tsx        # Client Component — full product form (reused for create + edit)
│   │   │   ├── order-bump-form.tsx     # Client Component — single order bump fields (used inside product-form)
│   │   │   ├── tracker-config-form.tsx # Client Component — add/remove trackers per product
│   │   │   └── product-list.tsx        # Client Component — product table with edit/delete actions
│   │   │
│   │   └── checkout/
│   │       ├── checkout-page.tsx       # Client Component — orchestrates entire checkout flow
│   │       ├── product-info.tsx        # Product name, description, image, price
│   │       ├── order-bump-card.tsx     # Single order bump with checkbox toggle
│   │       ├── buyer-form.tsx          # Name, email, phone fields
│   │       ├── order-summary.tsx       # Running total (product + selected bumps)
│   │       ├── yoco-payment.tsx        # Client Component — Yoco embedded SDK integration
│   │       └── success-content.tsx     # Success page content (thank you message)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client (NEXT_PUBLIC_ keys)
│   │   │   ├── server.ts              # Server-side Supabase client (service role key)
│   │   │   └── types.ts               # Generated/manual DB types (see Section 3)
│   │   │
│   │   ├── yoco/
│   │   │   ├── create-session.ts       # Server: create Yoco payment session via API
│   │   │   └── verify-webhook.ts       # Server: verify Yoco webhook signature
│   │   │
│   │   ├── trackers/
│   │   │   ├── types.ts                # ClientTrackerProvider + ServerTrackerProvider interfaces
│   │   │   ├── client-registry.ts      # createTrackerManager() — loads & fires client-side trackers
│   │   │   ├── server-registry.ts      # fireServerTrackers() — loads & fires server-side trackers
│   │   │   ├── providers/
│   │   │   │   ├── facebook-pixel.ts   # ClientTrackerProvider implementation
│   │   │   │   ├── facebook-capi.ts    # ServerTrackerProvider implementation
│   │   │   │   └── utmify.ts           # ServerTrackerProvider implementation
│   │   │   └── utm.ts                  # extractUtmParams(searchParams) — parse UTMs from URL
│   │   │
│   │   ├── notifications/
│   │   │   ├── email.ts                # sendConfirmationEmail(order, product) — via Resend
│   │   │   └── whatsapp.ts             # sendWhatsAppConfirmation(order, product) — via Meta Cloud API
│   │   │
│   │   ├── db/
│   │   │   ├── products.ts             # CRUD: getProductBySlug, getProductById, createProduct, updateProduct, deleteProduct
│   │   │   ├── order-bumps.ts          # CRUD: getOrderBumps, createOrderBump, updateOrderBump, deleteOrderBump
│   │   │   ├── orders.ts              # createOrder, updateOrderStatus, getOrderByPaymentId
│   │   │   ├── order-items.ts         # createOrderItems
│   │   │   └── product-trackers.ts    # CRUD: getProductTrackers, createTracker, deleteTracker
│   │   │
│   │   └── utils/
│   │       ├── currency.ts             # formatCurrency(amountCents, currency) → "N$ 149.99"
│   │       ├── slug.ts                 # generateSlug(name) — URL-friendly slugs
│   │       └── event-id.ts             # generateEventId() — for FB Pixel ↔ CAPI dedup
│   │
│   └── hooks/
│       └── use-tracker.ts              # React hook: initializes client trackers, exposes fire methods
│
└── README.md
```

---

## 2. Supabase Schema

```sql
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
```

---

## 3. TypeScript Types

```typescript
// src/lib/supabase/types.ts

// ============================================
// DATABASE ROW TYPES (match schema exactly)
// ============================================

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;           // cents
  currency: string;        // "NAD", "ZAR"
  image_url: string;
  delivery_url: string;
  upsell_url: string | null;
  back_redirect_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderBump {
  id: string;
  product_id: string;
  name: string;
  description: string;
  price: number;           // cents, same currency as parent product
  image_url: string;
  sort_order: number;
  created_at: string;
}

export interface ProductTracker {
  id: string;
  product_id: string;
  type: TrackerType;
  tracker_id: string;
  side: "client" | "server";
  config: Record<string, unknown> | null;
  created_at: string;
}

export type TrackerType = "facebook" | "utmify" | "google_ads" | "tiktok";

export interface Order {
  id: string;
  product_id: string;
  yoco_payment_id: string | null;
  status: "pending" | "paid" | "failed";
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  total_amount: number;    // cents
  currency: string;
  tracking_params: TrackingParams;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  type: "product" | "order_bump";
  reference_id: string;
  name: string;
  price: number;           // cents (snapshot)
  created_at: string;
}

export interface TrackingParams {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

// ============================================
// INSERT TYPES (omit auto-generated fields)
// ============================================

export type ProductInsert = Omit<Product, "id" | "created_at" | "updated_at">;
export type ProductUpdate = Partial<ProductInsert>;

export type OrderBumpInsert = Omit<OrderBump, "id" | "created_at">;
export type OrderBumpUpdate = Partial<Omit<OrderBumpInsert, "product_id">>;

export type ProductTrackerInsert = Omit<ProductTracker, "id" | "created_at">;

export type OrderInsert = Omit<Order, "id" | "created_at" | "updated_at">;
export type OrderItemInsert = Omit<OrderItem, "id" | "created_at">;

// ============================================
// COMPOSITE TYPES (for queries with joins)
// ============================================

export interface ProductWithBumps extends Product {
  order_bumps: OrderBump[];
}

export interface ProductWithBumpsAndTrackers extends ProductWithBumps {
  product_trackers: ProductTracker[];
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CreateOrderRequest {
  product_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  selected_bump_ids: string[];  // which order bumps the buyer checked
  tracking_params: TrackingParams;
}

export interface CreateOrderResponse {
  order_id: string;
  yoco_checkout_id: string;     // returned by Yoco to init embedded payment
}

// ============================================
// TRACKER INTERFACES
// ============================================

export interface CheckoutData {
  product_name: string;
  value: number;            // total in cents
  currency: string;
}

export interface PurchaseData extends CheckoutData {
  order_id: string;
  event_id: string;          // for FB Pixel ↔ CAPI dedup
}

export interface ClientTrackerProvider {
  type: string;
  init(trackerId: string): void;
  pageView(): void;
  initiateCheckout(data: CheckoutData): void;
  purchase(data: PurchaseData): void;
}

export interface ServerTrackerProvider {
  type: string;
  onOrderCreated(order: OrderWithItems, config: ProductTracker): Promise<void>;
  onOrderPaid(order: OrderWithItems, config: ProductTracker): Promise<void>;
}

export interface TrackerConfig {
  tracker_id: string;
  config: Record<string, unknown> | null;
}
```

---

## 4. Component Tree — Checkout Page

```
/checkout/[slug]/page.tsx  (SERVER COMPONENT)
│
│  Fetches: product + order_bumps + product_trackers from Supabase
│  Passes data as props to client boundary
│
└── <CheckoutPage>  (CLIENT COMPONENT — "use client")
    │
    │  State lives here:
    │  ├── selectedBumps: Set<string>     (which bump IDs are toggled on)
    │  ├── buyerInfo: { name, email, phone }
    │  ├── trackingParams: TrackingParams  (extracted from URL on mount)
    │  ├── paymentStatus: "idle" | "processing" | "success" | "failed"
    │  ├── eventId: string                 (generated once, shared with pixel + API)
    │  └── total: number                   (computed: product.price + selected bumps)
    │
    ├── <ProductInfo />                    (presentational — product image, name, desc, price)
    │
    ├── <OrderBumpCard                     (one per bump, presentational + checkbox)
    │     bump={bump}
    │     checked={selectedBumps.has(bump.id)}
    │     onToggle={toggleBump}
    │   />  × N
    │
    ├── <BuyerForm                         (controlled inputs: name, email, phone)
    │     value={buyerInfo}
    │     onChange={setBuyerInfo}
    │   />
    │
    ├── <OrderSummary                      (presentational — shows product + checked bumps + total)
    │     product={product}
    │     selectedBumps={...}
    │     total={total}
    │   />
    │
    ├── <YocoPayment                       (CLIENT COMPONENT)
    │     disabled={!formValid}
    │     onPaymentStart={handlePaymentStart}
    │     onPaymentSuccess={handleSuccess}
    │     onPaymentFailure={handleFailure}
    │   />
    │   │
    │   │  On "Pay" click:
    │   │  1. POST /api/checkout/[productId] with buyerInfo + selectedBumps + trackingParams
    │   │  2. Receive yoco_checkout_id
    │   │  3. Launch Yoco embedded SDK with that ID
    │   │
    │   │  On Yoco success callback:
    │   │  1. Fire tracker.purchase({ event_id, value, currency })
    │   │  2. Redirect to upsell_url or /success
    │
    └── <TrackerLoader />                  (CLIENT COMPONENT — invisible)
          │
          │  On mount:
          │  1. Extract UTM params from window.location.search → setTrackingParams
          │  2. Initialize client trackers via createTrackerManager(product_trackers)
          │  3. Fire pageView()
          │
          │  Exposes via ref/callback:
          │  - initiateCheckout()
          │  - purchase()
```

### Server vs Client boundary summary:

| Component | Type | Why |
|-----------|------|-----|
| `/checkout/[slug]/page.tsx` | Server | Fetches product data, SEO meta tags, no interactivity |
| `CheckoutPage` | Client | Manages form state, payment flow, tracker events |
| `ProductInfo` | Client (child) | Lives inside client boundary, pure presentational |
| `OrderBumpCard` | Client (child) | Checkbox toggle needs interactivity |
| `BuyerForm` | Client (child) | Controlled inputs |
| `OrderSummary` | Client (child) | Reacts to selectedBumps state |
| `YocoPayment` | Client | Yoco SDK is browser-only |
| `TrackerLoader` | Client | window.location, FB Pixel script injection |
| `SuccessContent` | Server | Static thank-you page, no interactivity |

---

## 5. Dependency List

### Core
| Package | Why |
|---------|-----|
| `next` | App framework (App Router) |
| `react` / `react-dom` | UI library |
| `typescript` | Type safety |

### Styling
| Package | Why |
|---------|-----|
| `tailwindcss` / `@tailwindcss/postcss` | Utility-first CSS |

### Database
| Package | Why |
|---------|-----|
| `@supabase/supabase-js` | Supabase client (DB queries + Storage uploads) |
| `@supabase/ssr` | Server-side Supabase client helpers for Next.js |

### Payment
| Package | Why |
|---------|-----|
| `@yoco/yoco-js` | Yoco embedded checkout SDK (client-side) — loaded via script tag, no npm package needed. Use their CDN. |

> **Note**: Yoco's embedded SDK is loaded as a `<script>` tag, not an npm package. The `create-session` call is a plain `fetch` to Yoco's REST API from the server. No Yoco npm dependency needed.

### Notifications
| Package | Why |
|---------|-----|
| `resend` | Send transactional emails (confirmation + delivery URL) |

> **Note**: Meta Cloud API for WhatsApp is called via plain `fetch` — no SDK needed.

### Utilities
| Package | Why |
|---------|-----|
| `nanoid` | Generate short unique IDs (event_id for FB dedup, payment references) |
| `slugify` | Generate URL-friendly slugs from product names |

### Dev
| Package | Why |
|---------|-----|
| `@types/react` / `@types/node` | TypeScript type definitions |
| `eslint` / `eslint-config-next` | Linting |

### NOT needed (keep it lean)
| Avoided | Why |
|---------|-----|
| `axios` | `fetch` is built into Next.js — no need for a wrapper |
| `prisma` / `drizzle` | Supabase client handles queries directly — adding an ORM is overhead for this scale |
| `next-auth` | No auth in MVP |
| `zod` | Can add later for validation, but for MVP simple checks in API routes are enough |
| `@yoco/*` npm | Yoco SDK loads via CDN script tag |
| `twilio` | Using Meta Cloud API directly via fetch, not Twilio |

### Total npm dependencies: ~8 production, ~3 dev
