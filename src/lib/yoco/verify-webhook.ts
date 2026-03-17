import { createHmac } from "crypto";

export function verifyYocoWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.YOCO_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return signature === expectedSignature;
}
