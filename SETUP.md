# Yoco Gateway (Checkout Creator) -- Setup & Deployment Guide

Complete guide to get the project running locally and deployed to production.

---

## 1. Prerequisites

Before starting, make sure you have:

1. **Node.js** v18 or newer installed (check with `node -v`)
2. **npm** (comes with Node.js)
3. **A Supabase account** -- free tier works. Sign up at [supabase.com](https://supabase.com)
4. **A Yoco business account** -- sign up at [yoco.com](https://www.yoco.com). You need this to accept card payments
5. **A Resend account** -- free tier (3,000 emails/month). Sign up at [resend.com](https://resend.com)
6. **(Optional) A Meta Business account** -- only needed if you want WhatsApp notifications

---

## 2. Supabase Setup

### 2.1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose an organization (or create one)
4. Set a project name (e.g., `checkout-creator`)
5. Set a strong database password -- save it somewhere, you will need it if you connect directly
6. Choose the region closest to your users (for Namibia/South Africa, choose a European or African region)
7. Click **Create new project** and wait for it to finish provisioning

### 2.2. Run the migration SQL

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project
4. Copy the entire contents and paste it into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" -- this means all tables, indexes, RLS policies, and the storage bucket were created

This creates:
- 5 tables: `products`, `order_bumps`, `product_trackers`, `orders`, `order_items`
- Indexes for fast lookups
- Row Level Security policies
- An `updated_at` trigger
- A public storage bucket called `product-images`

### 2.3. Verify the storage bucket

1. Go to **Storage** in the left sidebar
2. You should see a bucket called `product-images`
3. If it was not created by the migration (sometimes the storage insert requires permissions), create it manually:
   - Click **New bucket**
   - Name: `product-images`
   - Toggle **Public bucket** to ON
   - Click **Create bucket**

### 2.4. Copy your environment variables

1. Go to **Settings** > **API** in the Supabase dashboard
2. Copy these three values:
   - **Project URL** -- this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon (public) key** -- this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role (secret) key** -- this is `SUPABASE_SERVICE_ROLE_KEY`

**Important**: The service role key bypasses Row Level Security. Never expose it to the client/browser.

---

## 3. Yoco Setup

### 3.1. Create a Yoco business account

1. Go to [yoco.com](https://www.yoco.com) and sign up for a business account
2. Complete the verification process (business details, bank account, etc.)
3. Once approved, log in to the [Yoco Business Portal](https://portal.yoco.com)

### 3.2. Get your API keys

1. In the Yoco portal, go to **Developers** (or **Settings** > **API Keys**)
2. You will see **Test** and **Live** key pairs
3. For development, use the **Test** keys:
   - **Secret Key** (starts with `sk_test_...`) -- this is `YOCO_SECRET_KEY`
   - **Public Key** (starts with `pk_test_...`) -- this is `NEXT_PUBLIC_YOCO_PUBLIC_KEY`

### 3.3. Currency: ZAR only

**Important**: Yoco only supports ZAR (South African Rand) as a payment currency. The system is designed for selling in Namibia where the Namibian Dollar (NAD) is pegged 1:1 to ZAR. When creating a payment session, the code always sends `currency: "ZAR"` to Yoco, regardless of what currency the product is configured with. The buyer sees the product price in NAD on the checkout page, but the actual charge goes through Yoco as ZAR at the same amount.

If you see an error like "NAD is unsupported currency", it means the Yoco API call is not forcing ZAR. Check `src/app/api/checkout/[productId]/route.ts` -- the `createYocoSession` call should have `currency: "ZAR"`.

### 3.4. Test card for development

When using Yoco test keys, use this card to simulate payments:

- **Card number**: `4111 1111 1111 1111`
- **Expiry**: any future date (e.g., `12/30`)
- **CVV**: any 3 digits (e.g., `123`)

---

## 4. Yoco Webhook Setup

**This is the most critical part of the setup.** Without a working webhook, payments will succeed on Yoco's side but your system will never know about it. Orders will stay "pending" forever, no confirmation email will be sent, and no server-side trackers (Facebook CAPI, UTMify) will fire.

### How it works

1. Buyer pays on your checkout page via Yoco embedded checkout
2. Yoco processes the payment
3. Yoco sends a POST request to your webhook URL: `POST /api/webhooks/yoco`
4. Your server verifies the webhook signature using HMAC-SHA256
5. If valid, the order status is updated from "pending" to "paid"
6. The server fires notifications (email via Resend, WhatsApp) and server-side trackers (Facebook CAPI, UTMify)

### 4.1. For LOCAL development (using ngrok)

Your local machine (`localhost:3000`) is not reachable from the internet, so Yoco cannot send webhooks to it. You need a tunnel.

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   ```
   Or download from [ngrok.com](https://ngrok.com). You will need a free ngrok account.

2. **Start your dev server** (in one terminal):
   ```bash
   npm run dev
   ```

3. **Start ngrok** (in a second terminal):
   ```bash
   npx ngrok http 3000
   ```

4. **Copy the HTTPS URL** that ngrok gives you. It looks like:
   ```
   https://a1b2c3d4.ngrok-free.app
   ```

5. **Update your `.env.local`** file:
   ```
   NEXT_PUBLIC_APP_URL=https://a1b2c3d4.ngrok-free.app
   ```
   This is important because the checkout API uses `NEXT_PUBLIC_APP_URL` to build the success/cancel/failure redirect URLs that Yoco needs.

6. **Register the webhook in Yoco's dashboard**:
   - Go to the Yoco Business Portal > **Developers** > **Webhooks**
   - Click **Add Webhook** (or similar)
   - Set the URL to: `https://a1b2c3d4.ngrok-free.app/api/webhooks/yoco`
   - Select the event type: `payment.succeeded`
   - Save the webhook
   - Yoco will give you a **webhook secret** -- copy it

7. **Set the webhook secret in `.env.local`**:
   ```
   YOCO_WEBHOOK_SECRET=your_webhook_secret_here
   ```

8. **Restart your dev server** (so it picks up the new env vars)

**Note**: Every time you restart ngrok, you get a new URL. You will need to update both `NEXT_PUBLIC_APP_URL` in `.env.local` and the webhook URL in Yoco's dashboard. Consider a paid ngrok plan for a stable subdomain.

### 4.2. For PRODUCTION (Vercel)

1. **Deploy your app to Vercel** (see Section 11)
2. Once deployed, your app has a stable URL like `https://yourdomain.com`
3. **Register the webhook in Yoco's dashboard**:
   - Go to Yoco Business Portal > **Developers** > **Webhooks**
   - Set the URL to: `https://yourdomain.com/api/webhooks/yoco`
   - Select event type: `payment.succeeded`
   - Copy the webhook secret
4. **Set `YOCO_WEBHOOK_SECRET`** in Vercel's environment variables (Settings > Environment Variables)
5. Switch from Test keys to **Live keys** in Vercel's env vars (`YOCO_SECRET_KEY`, `NEXT_PUBLIC_YOCO_PUBLIC_KEY`)

### 4.3. Webhook signature verification

The webhook handler in `src/app/api/webhooks/yoco/route.ts` verifies every incoming request:

1. It reads the raw request body as text
2. It reads the `webhook-signature` header from the request
3. It computes an HMAC-SHA256 hash of the body using `YOCO_WEBHOOK_SECRET` as the key
4. It compares the computed hash with the signature header
5. If they do not match, the request is rejected with 401

If your webhook is returning 401 errors, double-check that `YOCO_WEBHOOK_SECRET` matches exactly what Yoco provided.

---

## 5. Resend (Email) Setup

Resend is used to send purchase confirmation emails with the product delivery URL.

### 5.1. Create account and get API key

1. Go to [resend.com](https://resend.com) and sign up (free tier: 3,000 emails/month)
2. In the dashboard, go to **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., `checkout-creator`)
5. Copy the key -- this is `RESEND_API_KEY`

### 5.2. Set the sender address

**Important limitation for testing**: Resend provides a shared sender address `onboarding@resend.dev`. When using this address as `EMAIL_FROM`, emails can ONLY be sent to the email address you signed up to Resend with. Sending to any other address will fail silently or return an error. This is a Resend restriction for unverified domains.

For testing:
```
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
```

For production:
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain** and follow DNS verification steps (add TXT/MX records)
3. Once verified, use your own domain:
   ```
   EMAIL_FROM=noreply@yourdomain.com
   ```

### 5.3. What the email contains

The confirmation email includes:
- Buyer's name in greeting
- Product name
- Total amount formatted with currency
- A prominent "Access Your Product" button linking to the product's `delivery_url`
- A plain-text fallback of the delivery URL

---

## 6. WhatsApp Setup (Optional)

WhatsApp notifications are optional. The system handles missing WhatsApp env vars gracefully -- it logs a warning and continues without sending. You can skip this entirely for MVP.

### If you want to set it up later:

1. **Create a Meta Business account** at [business.facebook.com](https://business.facebook.com)
2. Go to **Meta for Developers** ([developers.facebook.com](https://developers.facebook.com))
3. Create an app with **WhatsApp** product enabled
4. In the WhatsApp section, set up a **Business Phone Number**
5. Get your:
   - **Permanent Access Token** -- this is `WHATSAPP_ACCESS_TOKEN`
   - **Phone Number ID** -- this is `WHATSAPP_PHONE_NUMBER_ID`
6. For production, you need an **approved message template**. The current code sends a freeform text message, which only works with the test phone number during development
7. Set the env vars in `.env.local`:
   ```
   WHATSAPP_ACCESS_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   ```

**Note**: During development, Meta provides a test phone number and lets you send messages to up to 5 verified recipient numbers.

---

## 7. Facebook Pixel + Conversions API (CAPI) Setup

Trackers are configured **per product** in the admin panel, not globally via environment variables. This lets you run different ad accounts or pixels for different products.

### 7.1. Client-side Facebook Pixel

This fires tracking events in the buyer's browser.

1. Go to your product's edit page in the admin panel (`/admin/[productId]/edit`)
2. In the **Trackers** section, add a new tracker with:
   - **Type**: `facebook`
   - **Side**: `client`
   - **Tracker ID**: your Facebook Pixel ID (e.g., `123456789012345`)
   - **Config**: leave empty (not needed for client-side pixel)

Events fired by the Pixel:
- **PageView** -- when the checkout page loads
- **InitiateCheckout** -- when the buyer clicks the Pay button (includes product name, value, currency)
- **Purchase** -- on successful payment (includes `eventID` for deduplication with CAPI)

### 7.2. Server-side Conversions API (CAPI)

This sends a server-side Purchase event to Facebook for better attribution accuracy (especially after iOS 14+ privacy changes).

1. In the same product's edit page, add another tracker:
   - **Type**: `facebook`
   - **Side**: `server`
   - **Tracker ID**: your Facebook Pixel ID (same as above)
   - **Config** (JSON object): must include:
     ```json
     {
       "access_token": "your_facebook_capi_access_token",
       "dataset_id": "your_dataset_id"
     }
     ```

To get these:
- **access_token**: In Facebook Events Manager > Settings > generate a System User token with `ads_management` permission
- **dataset_id**: This is your Pixel ID / dataset ID in Events Manager

### 7.3. Event deduplication

Both the client-side Pixel and server-side CAPI send a `Purchase` event. To prevent Facebook from counting it twice, both events include the same `event_id`. The checkout flow generates this ID once and passes it to both the Pixel (in the browser) and CAPI (in the webhook handler via `order.tracking_params.event_id`).

### 7.4. CAPI data sent to Facebook

The server-side Purchase event includes:
- Hashed buyer email, phone, first name, last name (SHA-256, as required by Facebook)
- Purchase value and currency
- Content IDs (product and order bump IDs)
- Individual item prices

---

## 8. UTMify Setup

UTMify is a server-side-only tracker used for tracking sales attribution. It is configured per product.

### 8.1. Add tracker to a product

1. Go to your product's edit page in the admin panel
2. In the **Trackers** section, add a new tracker:
   - **Type**: `utmify`
   - **Side**: `server`
   - **Tracker ID**: your UTMify API token
   - **Config** (JSON object): must include:
     ```json
     {
       "api_token": "your_utmify_api_token"
     }
     ```

### 8.2. Events fired

- **orderCreated** (on checkout, when order is created with status `waiting_payment`): sends order details, customer info, products, UTM tracking parameters, and commission data to UTMify
- **orderPaid** (on webhook, when payment is confirmed with status `paid`): sends the same order data with updated status

### 8.3. Data sent to UTMify

The payload includes:
- `orderId`: the order UUID
- `platform`: `"YocoGateway"`
- `paymentMethod`: `"credit_card"`
- `customer`: buyer name, email, phone
- `products`: list of purchased items with prices
- `trackingParameters`: all UTM params captured from the checkout URL (`src`, `sck`, `utm_source`, `utm_campaign`, `utm_medium`, `utm_content`, `utm_term`)
- `commission`: total price, gateway fee, and user commission (all in cents)

---

## 9. Environment Variables Reference

Create a file called `.env.local` in the project root. Copy from `.env.example` and fill in the values.

| Variable | Required | Where to get it | Example |
|----------|----------|----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase > Settings > API > Project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase > Settings > API > anon (public) key | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase > Settings > API > service_role (secret) key | `eyJhbGci...` |
| `YOCO_SECRET_KEY` | Yes | Yoco Portal > Developers > API Keys > Secret Key | `sk_test_abc123...` |
| `NEXT_PUBLIC_YOCO_PUBLIC_KEY` | Yes | Yoco Portal > Developers > API Keys > Public Key | `pk_test_abc123...` |
| `YOCO_WEBHOOK_SECRET` | Yes | Yoco Portal > Developers > Webhooks (given when you register a webhook) | `whsec_abc123...` |
| `RESEND_API_KEY` | Yes | Resend > API Keys | `re_abc123...` |
| `EMAIL_FROM` | Yes | Your verified domain, or `onboarding@resend.dev` for testing | `noreply@yourdomain.com` |
| `WHATSAPP_ACCESS_TOKEN` | No | Meta for Developers > WhatsApp > API Setup | `EAAGabc123...` |
| `WHATSAPP_PHONE_NUMBER_ID` | No | Meta for Developers > WhatsApp > Phone Numbers | `109876543210` |
| `NEXT_PUBLIC_APP_URL` | Yes | Your deployment URL (or ngrok/cloudflared URL for local dev) | `https://yourdomain.com` |
| `WHOP_API_KEY` / `WHOP_COMPANY_ID` / `WHOP_WEBHOOK_SECRET` | No | Only used by the isolated `/whop-test` tooling (Section 13.7) | `apik_...` / `biz_...` / `whsec_...` |

**Note**: Facebook Pixel IDs, CAPI tokens, UTMify API tokens, Stripe keys, and the **real** Whop keys are NOT environment variables. They are configured per product/user in the database via the admin panel (product edit page and Admin → Configurações).

---

## 10. Running Locally

### 10.1. Install dependencies

```bash
npm install
```

### 10.2. Create your environment file

```bash
cp .env.example .env.local
```

Fill in all required values following Sections 2-5 of this guide.

### 10.3. Start the dev server

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### 10.4. Create a test product

1. Go to `http://localhost:3000/admin/create`
2. Fill in the product details:
   - **Name**: e.g., "Test Digital Product"
   - **Slug**: auto-generated from name, or type your own
   - **Price**: in cents (e.g., `14999` for N$149.99)
   - **Currency**: NAD or ZAR
   - **Delivery URL**: the URL buyers receive after purchase (e.g., `https://example.com/access`)
3. Optionally add order bumps and trackers
4. Click **Create Product**

### 10.5. Test the checkout flow

1. Go to `http://localhost:3000/checkout/test-digital-product` (replace with your product's slug)
2. Fill in buyer details (name, email, phone)
3. Optionally select order bumps
4. Click Pay -- you will be redirected to Yoco's hosted checkout
5. Use the test card: `4111 1111 1111 1111`, any future expiry, any 3-digit CVV
6. If webhooks are configured (see Section 4.1), the order will be updated to "paid" and you will receive a confirmation email

### 10.6. View products

Go to `http://localhost:3000/admin` to see all products and manage them.

---

## 11. Deploy to Vercel

### 11.1. Push to GitHub

1. Create a GitHub repository
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

### 11.2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** > **Project**
3. Import your GitHub repository
4. Vercel auto-detects Next.js -- no need to change build settings

### 11.3. Set environment variables

Before deploying, go to **Settings** > **Environment Variables** and add all required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `YOCO_SECRET_KEY` (use **Live** key for production)
- `NEXT_PUBLIC_YOCO_PUBLIC_KEY` (use **Live** key for production)
- `YOCO_WEBHOOK_SECRET` (from the production webhook you will register)
- `RESEND_API_KEY`
- `EMAIL_FROM` (use your verified domain, e.g., `noreply@yourdomain.com`)
- `NEXT_PUBLIC_APP_URL` (your Vercel domain, e.g., `https://yourdomain.com`)
- `WHATSAPP_ACCESS_TOKEN` (optional)
- `WHATSAPP_PHONE_NUMBER_ID` (optional)

### 11.4. Deploy

Click **Deploy**. Vercel will build and deploy your app.

### 11.5. Register production webhook

After deployment:
1. Go to Yoco Business Portal > **Developers** > **Webhooks**
2. Add a new webhook (or update the existing one):
   - URL: `https://yourdomain.com/api/webhooks/yoco`
   - Event: `payment.succeeded`
3. Copy the webhook secret and set it as `YOCO_WEBHOOK_SECRET` in Vercel's env vars
4. Redeploy if needed (Vercel > Deployments > Redeploy)

### 11.6. Switch to Yoco Live keys

Make sure you replace the test keys with live keys in Vercel's environment variables:
- `YOCO_SECRET_KEY` = `sk_live_...`
- `NEXT_PUBLIC_YOCO_PUBLIC_KEY` = `pk_live_...`

---

## 12. Common Issues / Troubleshooting

### "Payment stays pending" / Order status never changes to "paid"

**Cause**: The Yoco webhook is not configured, or is not reaching your server.

**Fix**:
1. Check that the webhook URL is correctly registered in Yoco's dashboard
2. For local dev: make sure ngrok is running and the URL matches what is in Yoco
3. Check that `YOCO_WEBHOOK_SECRET` is set in `.env.local`
4. Check your server logs for webhook errors (401 = signature mismatch, 404 = order not found)

### "Email not sent after payment"

**Cause**: Usually one of two things:
1. The webhook is not firing (see above) -- the email is sent from the webhook handler, not from the client
2. You are using `onboarding@resend.dev` as `EMAIL_FROM` and trying to send to an email that is not your Resend account email. This is a Resend test limitation -- only the account owner's email can receive test emails

**Fix**: Verify your domain in Resend and use `noreply@yourdomain.com` as `EMAIL_FROM`

### "NAD is unsupported currency" error from Yoco

**Cause**: The code is sending the product's currency (NAD) directly to Yoco instead of forcing ZAR.

**Fix**: Check `src/app/api/checkout/[productId]/route.ts`. The `createYocoSession` call should have `currency: "ZAR"` hardcoded, not `currency: product.currency`. NAD is pegged 1:1 to ZAR so the amount is identical.

### "supabaseUrl is required" error

**Cause**: The `.env.local` file is missing or the Supabase environment variables are not set.

**Fix**:
1. Make sure `.env.local` exists in the project root
2. Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
3. Restart the dev server after changing env vars

### Orders table is empty after a successful payment

**Cause**: The webhook is receiving the request but signature verification is failing, so the order is never updated. Or the order was never created in the first place (checkout API error).

**Fix**:
1. Check server logs for "Yoco webhook: invalid signature"
2. Make sure `YOCO_WEBHOOK_SECRET` in `.env.local` matches exactly what Yoco provided (no extra spaces, no quotes around the value)
3. If using ngrok, make sure the webhook URL in Yoco points to the current ngrok URL

### "CORS error" or "Failed to fetch" on the checkout page

**Cause**: Usually `NEXT_PUBLIC_APP_URL` does not match the actual URL you are accessing the site from.

**Fix**: Make sure `NEXT_PUBLIC_APP_URL` matches your browser's URL. For ngrok, it should be the ngrok HTTPS URL, not `http://localhost:3000`.

### Image upload fails

**Cause**: The `product-images` storage bucket does not exist or its policies are not set up.

**Fix**: Go to Supabase > Storage and verify the `product-images` bucket exists and is public. If not, create it manually (see Section 2.3).

### Facebook CAPI events not showing in Events Manager

**Cause**: Missing or incorrect `access_token` or `dataset_id` in the tracker config.

**Fix**:
1. Check the product's server-side Facebook tracker config in the admin panel
2. Make sure `access_token` and `dataset_id` are set in the config JSON
3. Check server logs for "Facebook CAPI error" messages
4. Verify the access token has the required permissions in Meta Business Suite

### UTMify not receiving events

**Cause**: The tracker is not configured on the product, or the API token is wrong.

**Fix**:
1. Check the product has a tracker with type `utmify`, side `server`, and a valid API token as `tracker_id`
2. Check server logs for "UTMify error" messages

---

## 13. Whop Integration

Whop is a second, fully wired payment provider alongside Stripe. Each product has a **Provedor de Pagamento** toggle (Stripe or Whop) in its admin edit page — whichever is active is the integration the product's checkout link actually uses. Credentials resolve the same way as Stripe's: a per-product override (Custom Whop Account card) takes priority over the account-level keys in **Admin → Configurações**.

The checkout itself renders as an **embedded** form (`@whop/checkout/react`'s `WhopCheckoutEmbed`), same UX as Stripe's embedded checkout — no redirect to a Whop-hosted page, and (for plain card payments) no public HTTPS URL needed locally at all.

### 13.1. Run the schema migration first

This integration needs 4 new columns on `products` and 3 on `user_settings`. Run `supabase/migrations/003_add_whop_payment_provider.sql` in the Supabase SQL Editor (same steps as Section 2.2) before anything else — the checkout/admin routes will error on missing columns until this is applied.

### 13.2. Create a Whop account and get your API key

1. Go to [whop.com](https://whop.com) and create an account / business
2. In the dashboard, find **Account API Keys** (Developer settings)
3. Click **Create**, name it, and grant at least: `checkout_configuration:create`, `checkout_configuration:basic:read`, `plan:create`, `access_pass:create`, `access_pass:update` (the **Admin** role covers all of these plus more, if you'd rather not pick individually)
4. Copy the key

### 13.3. Get your Company ID

Visible in the dashboard URL whenever you're on a company page: `whop.com/dashboard/biz_XXXXXXX/...`. Copy the `biz_...` part.

### 13.4. Configure keys

- **Account-level default** (used by any product left on Whop without its own override): **Admin → Configurações → Chaves Whop** — paste API Key + Company ID there. Leave Webhook Secret for step 13.6.
- **Per-product override**: on a product's edit page, set **Provedor de Pagamento** to Whop, then enable **Custom Whop Account** and fill in its own API Key / Company ID / Webhook Secret if this product should use a different Whop business than the account default.

### 13.5. Register the webhook (needs a tunnel — for the webhook only)

The embed itself doesn't need a tunnel (see above), but Whop still needs a public URL to deliver the webhook to, same as Yoco's setup in Section 4.1:

1. Start the dev server: `npm run dev`
2. In another terminal: `npx cloudflared tunnel --url http://localhost:3000` (no account needed — if the quick tunnel comes back flaky/`530`, just kill it and start a fresh one, or try `npx ngrok http 3000` instead)
3. Copy the HTTPS URL it prints (e.g. `https://random-words.trycloudflare.com`)
4. In the Whop dashboard: **Developer → Webhooks → Create Webhook**
   - Account-level: URL = `https://<tunnel>/api/webhooks/whop/<your-user-id>` (shown on the Configurações page)
   - Per-product override: URL = `https://<tunnel>/api/webhooks/whop/product/<productId>` (shown on the product's edit page, under Custom Whop Account)
   - Select at least `payment.succeeded`
5. Save — copy the **webhook secret** Whop gives you into the matching Webhook Secret field (account settings or per-product) and re-save

Note: `NEXT_PUBLIC_APP_URL` does **not** need to point at the tunnel for the embed to work — leave it as your normal local URL. It only needs to be a real https domain if you want the embed's `returnUrl` fallback (for 3DS/redirect-based payment methods) to work locally too; otherwise plain card payments complete entirely in the embed via the `onComplete` callback.

### 13.6. Test the real flow

1. Open the checkout link for a product with Whop active (`/checkout/<slug>`)
2. Fill in buyer details — the embedded Whop checkout form loads inline (no redirect)
3. Complete the payment (Whop has no clearly documented sandbox/test-card mode as of writing — check the dashboard for a test-mode toggle, or use a low-value real charge)
4. On completion, the page calls `/api/payment-callback` in the background (marks the order paid, same side effects as Stripe's redirect) and proceeds to the success/upsell page — no navigation away from your site
5. The webhook is the durable confirmation — check your terminal for `received: true` — and re-confirms `orderPaid` for server-side trackers (UTMify etc.)

### 13.7. Isolated test tooling (unchanged, still useful)

The standalone tooling from before still works independently of any product, useful for debugging the Whop API/webhook mechanics in isolation without needing a real product: `/whop-test` page, `POST /api/whop/test-checkout`, and the generic `POST /api/webhooks/whop` (all driven by the global `WHOP_API_KEY` / `WHOP_COMPANY_ID` / `WHOP_WEBHOOK_SECRET` env vars, not the DB-backed per-product/per-user keys).

### 13.8. Webhook signature verification

`src/lib/whop/verify-webhook.ts` implements the Standard Webhooks HMAC-SHA256 check directly (Node `crypto`, no SDK dependency) against whichever secret is passed in — the per-user or per-product secret for the real routes, or `WHOP_WEBHOOK_SECRET` for the isolated test route. A 401 means the signature didn't match — double check the secret was copied exactly (including the `whsec_` prefix) and that the tunnel URL registered in Whop matches the one currently running.
