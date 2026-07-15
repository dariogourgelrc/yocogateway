import { TextEncoder, TextDecoder } from "util";

// jsdom (this suite's test environment) doesn't provide these globally, but
// the standardwebhooks package (used here only to sign test fixtures) needs them.
if (typeof global.TextEncoder === "undefined") {
  (global as unknown as { TextEncoder: unknown }).TextEncoder = TextEncoder;
  (global as unknown as { TextDecoder: unknown }).TextDecoder = TextDecoder;
}

import { Webhook } from "standardwebhooks";
import { constructWhopEvent } from "./verify-webhook";

const SECRET = "whsec_" + Buffer.from("test_whop_webhook_secret_32bytes").toString("base64");

function sign(body: string, msgId: string, timestamp: Date) {
  const wh = new Webhook(SECRET);
  return wh.sign(msgId, timestamp, body);
}

function makeHeaders(body: string, msgId = "msg_1", timestamp = new Date()) {
  return {
    "webhook-id": msgId,
    "webhook-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
    "webhook-signature": sign(body, msgId, timestamp),
  };
}

const eventBody = JSON.stringify({
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

describe("constructWhopEvent", () => {
  it("returns the parsed event for a valid signature", () => {
    const event = constructWhopEvent(eventBody, makeHeaders(eventBody));
    expect(event?.type).toBe("payment.succeeded");
    expect(event?.id).toBe("evt_1");
  });

  it("returns null for an invalid signature", () => {
    const headers = makeHeaders(eventBody);
    headers["webhook-signature"] = "v1,not-a-real-signature";
    expect(constructWhopEvent(eventBody, headers)).toBeNull();
  });

  it("returns null when the body has been tampered with", () => {
    const headers = makeHeaders(eventBody);
    const tamperedBody = eventBody.replace("payment.succeeded", "payment.failed");
    expect(constructWhopEvent(tamperedBody, headers)).toBeNull();
  });

  it("returns null when required headers are missing", () => {
    expect(constructWhopEvent(eventBody, {})).toBeNull();
  });

  it("returns null when the webhook secret is not configured", () => {
    delete process.env.WHOP_WEBHOOK_SECRET;
    expect(constructWhopEvent(eventBody, makeHeaders(eventBody))).toBeNull();
  });
});
