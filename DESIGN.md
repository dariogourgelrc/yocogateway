# Checkout Creator MVP — Design Document

## Understanding Summary

- **What**: A lightweight checkout creator for selling digital products in Namibia (and potentially other markets)
- **Why**: Stripped-down alternative to Hotmart/Kiwify — create product checkout pages, accept payments via Yoco, send automated notifications
- **Who**: Single operator (creator), buyers as end users
- **Stack**: Next.js (App Router) + TypeScript + Supabase + Vercel

### Key Constraints
- Multi-currency (NAD, ZAR, potentially more), set per product
- Yoco embedded checkout (payment stays on your page)
- Multiple order bumps per product, each fully featured (name, price, description, image)
- Product images uploaded to Supabase Storage
- Extensible architecture for future features
- Single developer, hosted on Vercel + Supabase

### Non-Goals (MVP)
- Admin analytics dashboard (track sales on Yoco's platform)
- User accounts / auth
- Recurring payments / subscriptions
- Refund logic
- Coupon / discount codes

---

## Assumptions

1. Products are digital (delivery = a URL sent via email)
2. Order bumps share the parent product's currency
3. Per-product Facebook Pixel ID (not global)
4. WhatsApp via Meta Cloud API (free tier)
5. Email via Resend
6. Hidden `/admin` routes with no protection — acceptable for single operator MVP
7. Webhook must be idempotent (handle Yoco retries)
8. Up to ~1,000 concurrent visitors at peak
9. Upsell is a redirect URL, not a built-in upsell page
10. Back redirect is per-product
11. Yoco supports the currencies needed (NAD/ZAR)

---

## Pages & Routes

### All Pages
- `/checkout/[product-slug]` — checkout page (product info, order bumps, buyer form, Yoco embedded payment)
- `/checkout/[product-slug]/success` — default success page (when no upsell)
- `/checkout/[product-slug]/cancel` — abandonment handler → fires back redirect
- `/admin` — list all products
- `/admin/create` — create product (with order bumps, image upload, tracker config)
- `/admin/[product-id]/edit` — edit product

### API Routes
- `POST /api/products` — create product
- `PUT /api/products/[id]` — update product
- `DELETE /api/products/[id]` — delete product
- `POST /api/checkout/[product-id]` — initiate Yoco payment session, save pending order
- `POST /api/webhooks/yoco` — receive Yoco payment confirmation
- `POST /api/upload` — image upload to Supabase Storage

---

## Data Model

### `products`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| slug | text (unique) | URL-friendly, used in checkout route |
| name | text | |
| description | text | |
| price | integer | Price in smallest currency unit (cents) |
| currency | text | e.g., "NAD", "ZAR" |
| image_url | text | Supabase Storage URL |
| delivery_url | text | URL sent in confirmation email |
| upsell_url | text (nullable) | Redirect after success, null = show default success page |
| back_redirect_url | text (nullable) | Redirect on abandonment |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `order_bumps`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| product_id | uuid (FK → products) | |
| name | text | |
| description | text | |
| price | integer | Cents, same currency as parent product |
| image_url | text | Supabase Storage URL |
| sort_order | integer | Display order on checkout page |
| created_at | timestamptz | |

### `product_trackers`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| product_id | uuid (FK → products) | |
| type | text | "facebook", "utmify", "google_ads", "tiktok", etc. |
| tracker_id | text | Pixel ID for client-side, API token for server-side |
| side | text | "client" or "server" |
| config | jsonb (nullable) | Tracker-specific settings (e.g., FB CAPI access_token, dataset_id) |
| created_at | timestamptz | |

### `orders`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| product_id | uuid (FK → products) | |
| yoco_payment_id | text (unique) | Idempotency — prevents duplicate webhook processing |
| status | text | "pending", "paid", "failed" |
| buyer_name | text | |
| buyer_email | text | |
| buyer_phone | text | |
| total_amount | integer | Cents — product price + any bumps |
| currency | text | Copied from product at time of purchase |
| tracking_params | jsonb | `{ src, sck, utm_source, utm_campaign, utm_medium, utm_content, utm_term }` captured from checkout URL |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `order_items`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| order_id | uuid (FK → orders) | |
| type | text | "product" or "order_bump" |
| reference_id | uuid | Points to product.id or order_bump.id |
| name | text | Snapshot — name at time of purchase |
| price | integer | Snapshot — price at time of purchase |
| created_at | timestamptz | |

---

## Flow: Checkout → Payment → Webhook → Notifications

```
Buyer visits /checkout/[slug]
        │
        ▼
┌─────────────────────────┐
│  Checkout Page           │
│  - Product info          │
│  - Order bumps           │
│  - Buyer form            │
│  - Capture UTM params    │
│    from URL              │
│  - FB Pixel: PageView    │
│    + InitiateCheckout    │
└────────┬────────────────┘
         │ Buyer clicks "Pay"
         ▼
┌─────────────────────────┐
│ POST /api/checkout       │
│ - Validate input         │
│ - Calculate total        │
│ - Create order           │
│   (status: pending)      │
│ - Save UTM params        │
│ - Create order_items     │
│ - Init Yoco embedded     │
│   payment session        │
│ - Return session to      │
│   frontend               │
└────────┬────────────────┘
         │ Yoco embedded handles payment on page
         ▼
┌──────────────────────────────┐
│ Payment result (client-side) │
│                              │
│ SUCCESS →                    │
│   1. FB Pixel: Purchase      │
│      (with event_id for      │
│       CAPI dedup)            │
│   2. Redirect to upsell_url │
│      (or /success if none)   │
│                              │
│ FAILURE → show error,        │
│   let buyer retry            │
│                              │
│ ABANDON → redirect to        │
│   back_redirect_url          │
└──────────────────────────────┘

Meanwhile, asynchronously:

┌───────────────────────────────┐
│ POST /api/webhooks/yoco       │
│ - Verify webhook signature    │
│ - Find order by               │
│   yoco_payment_id             │
│ - If already "paid" →         │
│   return 200 (idempotent)     │
│ - Update order → "paid"       │
│                               │
│ Fire server-side trackers:    │
│ - FB Conversions API          │
│   (Purchase, same event_id)   │
│ - UTMify (status: "paid"      │
│   with tracking_params)       │
│                               │
│ Send notifications:           │
│ - Email via Resend            │
│   (delivery URL)              │
│ - WhatsApp via Meta Cloud API │
│   (purchase confirmation)     │
└───────────────────────────────┘
```

---

## Tracker Abstraction Layer

### Two Interfaces

```typescript
// lib/trackers/types.ts

// Client-side tracker (runs in browser)
interface ClientTrackerProvider {
  type: string;
  init(trackerId: string): void;
  pageView(): void;
  initiateCheckout(data: CheckoutData): void;
  purchase(data: PurchaseData): void;
}

// Server-side tracker (runs in webhook handler)
interface ServerTrackerProvider {
  type: string;
  onOrderCreated(order: Order, config: TrackerConfig): Promise<void>;
  onOrderPaid(order: Order, config: TrackerConfig): Promise<void>;
}
```

### Client-Side Registry

```typescript
// lib/trackers/registry.ts
function createTrackerManager(configs: ProductTracker[]) {
  const clientProviders = configs
    .filter(c => c.side === "client")
    .map(c => initClientProvider(c.type, c.tracker_id));

  return {
    pageView: () => clientProviders.forEach(p => p.pageView()),
    initiateCheckout: (d) => clientProviders.forEach(p => p.initiateCheckout(d)),
    purchase: (d) => clientProviders.forEach(p => p.purchase(d)),
  };
}
```

### Server-Side Registry

```typescript
// lib/trackers/server-registry.ts
async function fireServerTrackers(
  event: "orderCreated" | "orderPaid",
  order: Order,
  configs: ProductTracker[]
) {
  const serverConfigs = configs.filter(c => c.side === "server");
  await Promise.allSettled(
    serverConfigs.map(c => {
      const provider = getServerProvider(c.type);
      return event === "orderCreated"
        ? provider.onOrderCreated(order, c)
        : provider.onOrderPaid(order, c);
    })
  );
}
```

### Facebook (Hybrid: Client + Server)

- **Client**: Pixel fires PageView, InitiateCheckout, Purchase with `event_id`
- **Server**: CAPI sends Purchase event with same `event_id` for deduplication
- **Config**: `{ access_token, dataset_id }` stored in `product_trackers.config`

### UTMify (Server-Only)

- **Server**: POST to `https://api.utmify.com.br/api-credentials/orders`
- **Events**: `onOrderCreated` sends `status: "waiting_payment"`, `onOrderPaid` sends `status: "paid"`
- **Config**: `tracker_id` = UTMify API token
- **Payload mapping**:
  - `orderId` → `order.id`
  - `platform` → "YocoGateway"
  - `paymentMethod` → "credit_card" (from Yoco)
  - `customer` → `{ name: order.buyer_name, email: order.buyer_email, phone: order.buyer_phone }`
  - `products` → mapped from `order_items`
  - `trackingParameters` → `order.tracking_params`
  - `commission` → `{ totalPriceInCents: order.total_amount, gatewayFeeInCents: yoco_fee, userCommissionInCents: total - fee }`

### Adding a New Tracker

1. Create a new file implementing `ClientTrackerProvider` or `ServerTrackerProvider`
2. Register it in the provider map
3. No checkout page or webhook code changes needed

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only

# Yoco
YOCO_SECRET_KEY=                    # For creating payment sessions
YOCO_PUBLIC_KEY=                    # For embedded checkout (client-side)
YOCO_WEBHOOK_SECRET=                # For verifying webhook signatures

# Resend (Email)
RESEND_API_KEY=
EMAIL_FROM=                         # e.g. "noreply@yourdomain.com"

# WhatsApp (Meta Cloud API)
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=           # Your business phone number ID

# App
NEXT_PUBLIC_APP_URL=                # e.g. "https://yourdomain.com"
```

Note: UTMify API tokens, Facebook Pixel IDs, and CAPI credentials are stored per-product in `product_trackers`, NOT as env variables.

---

## Build Priority (MVP)

### Phase 1 — Core (working checkout)
1. Next.js project setup + Supabase schema (all tables)
2. Admin pages — create/list/edit products with order bumps + image upload
3. Checkout page — product display, order bumps, buyer form
4. Yoco embedded payment integration
5. Webhook handler — verify signature, update order to "paid", idempotency

### Phase 2 — Notifications
6. Email via Resend (delivery URL to buyer)
7. WhatsApp via Meta Cloud API (purchase confirmation)

### Phase 3 — Tracking & Redirects
8. Tracker abstraction layer (client + server interfaces)
9. Facebook Pixel (client) + Conversions API (server) — with event_id dedup
10. UTM param capture + UTMify server-side integration
11. Upsell redirect after success
12. Back redirect on abandonment

### Phase 4 — Polish
13. Success page (default, when no upsell)
14. Error handling & retry logic for notifications
15. Mobile responsiveness on checkout page

---

## After MVP

- Google Ads Pixel (implement `ClientTrackerProvider`)
- TikTok Pixel (implement `ClientTrackerProvider`)
- Additional currencies beyond NAD/ZAR
- User accounts / auth for admin routes
- Admin dashboard (sales analytics, conversion rates)
- Refund logic (update order status, notify UTMify with "refunded")
- Subscription / recurring payments
- A/B testing on checkout pages
- Custom checkout styling per product
- Coupon / discount codes
- Multiple payment gateways
- Affiliate / commission system

---

## Decision Log

| # | Decision | Alternatives Considered | Reason |
|---|----------|------------------------|--------|
| 1 | Normalized relational tables | JSON columns, Headless CMS | Best balance of simplicity and extensibility at 1-20 product scale |
| 2 | Per-product currency | Buyer-selects currency | Products are priced in a specific currency, simpler |
| 3 | Per-product trackers (not global) | Global pixel ID via env var | Flexibility to run different ad accounts per offer |
| 4 | Supabase Storage for images | External URL paste | Better UX for product creation |
| 5 | Two-layer tracker abstraction (client + server) | Single interface | UTMify and FB CAPI are server-side; pixels are client-side — fundamentally different |
| 6 | `product_trackers` table with `side` + `config` columns | Separate tables per tracker type | One table handles all current and future trackers |
| 7 | UTM params stored as jsonb on orders | Separate tracking_params table | Simple, one order = one set of UTMs, no joins needed |
| 8 | Snapshots in order_items (name, price) | Reference-only with FK | Historical accuracy — editing a product doesn't change past orders |
| 9 | Hidden /admin with no auth | Password gate, Supabase auth | MVP simplicity — acceptable risk for single operator |
| 10 | Facebook as hybrid tracker (Pixel + CAPI) | Pixel only | CAPI needed for accurate attribution post-iOS privacy changes |
| 11 | Yoco embedded checkout | Yoco redirect | Better conversion, pixels fire on your domain |
