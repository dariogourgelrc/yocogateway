import type Whop from "@whop/sdk";

// Constructed fresh per call (cheap, no network I/O) so it always reflects
// the current env vars — important for tests that set/unset them per case.
// apiKey is explicit because keys are per-user/per-product (stored in the DB),
// not a single global credential — falls back to WHOP_API_KEY for the
// isolated local-test routes under /api/whop and /api/webhooks/whop.
//
// @whop/sdk is required lazily (not imported at module top-level) so that
// routes which merely import create-session.ts — without ever hitting the
// Whop branch — don't pay for loading it. This matters under Jest: the SDK
// transitively pulls in `jose`, whose ESM-only build crashes Jest's CJS
// loader the moment it's actually executed (see src/lib/whop/verify-webhook.ts
// for the same issue on the webhook side).
export function getWhopClient(apiKey?: string): Whop {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WhopClient = require("@whop/sdk").default;
  return new WhopClient({
    apiKey: apiKey || process.env.WHOP_API_KEY,
    webhookKey: process.env.WHOP_WEBHOOK_SECRET ?? null,
  });
}
