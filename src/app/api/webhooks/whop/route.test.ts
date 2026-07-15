import { NextRequest } from "next/server";
import { Webhook } from "standardwebhooks";

const SECRET = "whsec_" + Buffer.from("test_whop_webhook_secret_32bytes").toString("base64");

import { POST } from "./route";

function sign(body: string, msgId: string, timestamp: Date) {
  const wh = new Webhook(SECRET);
  return wh.sign(msgId, timestamp, body);
}

function makeWebhookRequest(
  body: string,
  headerOverrides: Record<string, string> = {},
  msgId = "msg_1"
): NextRequest {
  const timestamp = new Date();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "webhook-id": msgId,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": sign(body, msgId, timestamp),
    ...headerOverrides,
  };
  return new NextRequest("http://localhost:3000/api/webhooks/whop", {
    method: "POST",
    body,
    headers,
  });
}

const paymentSucceededBody = JSON.stringify({
  id: "evt_1",
  api_version: "v1",
  type: "payment.succeeded",
  data: { id: "pay_1", metadata: { orderId: "order-1" } },
});

beforeEach(() => {
  process.env.WHOP_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.WHOP_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/whop", () => {
  it("returns 401 for an invalid signature", async () => {
    const res = await POST(
      makeWebhookRequest(paymentSucceededBody, { "webhook-signature": "v1,bad" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when the webhook secret is not configured", async () => {
    delete process.env.WHOP_WEBHOOK_SECRET;
    const res = await POST(makeWebhookRequest(paymentSucceededBody));
    expect(res.status).toBe(401);
  });

  it("returns 200 with the parsed event type and id for a valid signature", async () => {
    const res = await POST(makeWebhookRequest(paymentSucceededBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ received: true, type: "payment.succeeded", id: "evt_1" });
  });
});
