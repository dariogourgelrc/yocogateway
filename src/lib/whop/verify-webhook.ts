import { createHmac, timingSafeEqual } from "crypto";

// Verifies Whop's Standard Webhooks signature (https://www.standardwebhooks.com/)
// directly via Node's crypto, instead of pulling in the @whop/sdk client just for
// this — keeps it self-contained, same style as src/lib/yoco/verify-webhook.ts.

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;
const SECRET_PREFIX = "whsec_";

export interface WhopWebhookEvent {
  id: string;
  type: string;
  company_id?: string | null;
  data: Record<string, unknown>;
}

function decodeSecret(secret: string): Buffer {
  const stripped = secret.startsWith(SECRET_PREFIX)
    ? secret.slice(SECRET_PREFIX.length)
    : secret;
  return Buffer.from(stripped, "base64");
}

function expectedSignature(key: Buffer, msgId: string, timestamp: string, payload: string): string {
  const toSign = `${msgId}.${timestamp}.${payload}`;
  return createHmac("sha256", key).update(toSign).digest("base64");
}

export function constructWhopEvent(
  rawBody: string,
  headers: Record<string, string>,
  secretOverride?: string
): WhopWebhookEvent | null {
  const secret = secretOverride || process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) return null;

  const normalized: Record<string, string> = {};
  for (const key of Object.keys(headers)) {
    normalized[key.toLowerCase()] = headers[key];
  }

  const msgId = normalized["webhook-id"];
  const msgTimestamp = normalized["webhook-timestamp"];
  const msgSignature = normalized["webhook-signature"];
  if (!msgId || !msgTimestamp || !msgSignature) return null;

  const timestamp = parseInt(msgTimestamp, 10);
  if (Number.isNaN(timestamp)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return null;

  let key: Buffer;
  try {
    key = decodeSecret(secret);
  } catch {
    return null;
  }

  // Compared as UTF-8 text of the base64 signature, matching the Standard
  // Webhooks reference implementation (not decoded to raw bytes).
  const expected = Buffer.from(expectedSignature(key, msgId, msgTimestamp, rawBody), "utf8");

  const matches = msgSignature.split(" ").some((versioned) => {
    const [version, signature] = versioned.split(",");
    if (version !== "v1" || !signature) return false;
    const candidate = Buffer.from(signature, "utf8");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
  if (!matches) return null;

  try {
    return JSON.parse(rawBody) as WhopWebhookEvent;
  } catch {
    return null;
  }
}
