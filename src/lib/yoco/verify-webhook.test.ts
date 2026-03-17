import { createHmac } from "crypto";
import { verifyYocoWebhook } from "./verify-webhook";

const SECRET = "whsec_test_secret_123";

function sign(body: string, secret: string = SECRET): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

beforeEach(() => {
  process.env.YOCO_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.YOCO_WEBHOOK_SECRET;
});

describe("verifyYocoWebhook", () => {
  it("returns true for a valid signature", () => {
    const body = '{"type":"payment.succeeded"}';
    const sig = sign(body);
    expect(verifyYocoWebhook(body, sig)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    const body = '{"type":"payment.succeeded"}';
    expect(verifyYocoWebhook(body, "invalid_signature")).toBe(false);
  });

  it("returns false when signature header is missing", () => {
    const body = '{"type":"payment.succeeded"}';
    expect(verifyYocoWebhook(body, null)).toBe(false);
  });

  it("returns false when body has been tampered with", () => {
    const originalBody = '{"type":"payment.succeeded"}';
    const sig = sign(originalBody);
    const tamperedBody = '{"type":"payment.succeeded","amount":0}';
    expect(verifyYocoWebhook(tamperedBody, sig)).toBe(false);
  });

  it("returns false when webhook secret is not configured", () => {
    delete process.env.YOCO_WEBHOOK_SECRET;
    const body = '{"type":"payment.succeeded"}';
    const sig = sign(body);
    expect(verifyYocoWebhook(body, sig)).toBe(false);
  });
});
