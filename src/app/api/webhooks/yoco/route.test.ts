import { NextRequest } from "next/server";
import { createHmac } from "crypto";

const SECRET = "whsec_test_webhook_secret";

// --- Mock data ---
const mockOrder = {
  id: "order-1",
  product_id: "prod-1",
  yoco_payment_id: "yoco-pay-1",
  status: "pending" as const,
  buyer_name: "Jane",
  buyer_email: "jane@example.com",
  buyer_phone: "+264811234567",
  total_amount: 5000,
  currency: "NAD",
  tracking_params: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  order_items: [],
};

const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test",
  description: "",
  price: 5000,
  currency: "NAD",
  image_url: "",
  delivery_url: "",
  upsell_url: null,
  back_redirect_url: null,
  remarketing_enabled: false,
  remarketing_offer_1: null,
  remarketing_offer_2: null,
  remarketing_offer_3: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  order_bumps: [],
  product_trackers: [],
};

// --- Mocks ---
const mockGetOrderByPaymentId = jest.fn();
const mockUpdateOrderStatus = jest.fn().mockResolvedValue(mockOrder);
const mockSendEmail = jest.fn().mockResolvedValue(undefined);
const mockSendWhatsApp = jest.fn().mockResolvedValue(undefined);
const mockFireServerTrackers = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/db/orders", () => ({
  getOrderByPaymentId: (...args: unknown[]) =>
    mockGetOrderByPaymentId(...args),
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
}));

jest.mock("@/lib/db/products", () => ({
  getProductById: jest.fn().mockResolvedValue(mockProduct),
}));

jest.mock("@/lib/db/product-trackers", () => ({
  getProductTrackers: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/trackers/server-registry", () => ({
  fireServerTrackers: (...args: unknown[]) =>
    mockFireServerTrackers(...args),
}));

jest.mock("@/lib/notifications/email", () => ({
  sendConfirmationEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

jest.mock("@/lib/notifications/whatsapp", () => ({
  sendWhatsAppConfirmation: (...args: unknown[]) =>
    mockSendWhatsApp(...args),
}));

import { POST } from "./route";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

function makeWebhookRequest(
  body: string,
  signature?: string | null
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (signature !== null && signature !== undefined) {
    headers["webhook-signature"] = signature;
  }
  return new NextRequest("http://localhost:3000/api/webhooks/yoco", {
    method: "POST",
    body,
    headers,
  });
}

const paymentSucceededBody = JSON.stringify({
  type: "payment.succeeded",
  id: "yoco-pay-1",
  payload: { checkoutId: "yoco-pay-1" },
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.YOCO_WEBHOOK_SECRET = SECRET;
  mockGetOrderByPaymentId.mockResolvedValue({ ...mockOrder, status: "pending" });
});

afterEach(() => {
  delete process.env.YOCO_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/yoco", () => {
  // --- Security ---
  it("returns 401 for invalid webhook signature", async () => {
    const res = await POST(
      makeWebhookRequest(paymentSucceededBody, "bad-signature")
    );
    expect(res.status).toBe(401);
    expect(mockGetOrderByPaymentId).not.toHaveBeenCalled();
  });

  it("returns 401 when signature header is missing", async () => {
    const res = await POST(makeWebhookRequest(paymentSucceededBody, null));
    expect(res.status).toBe(401);
  });

  // --- Happy path ---
  it("updates order to paid on valid payment.succeeded", async () => {
    const sig = sign(paymentSucceededBody);
    const res = await POST(makeWebhookRequest(paymentSucceededBody, sig));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(json.order_id).toBe("order-1");
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith("order-1", "paid");
  });

  it("fires server trackers on payment success", async () => {
    const sig = sign(paymentSucceededBody);
    await POST(makeWebhookRequest(paymentSucceededBody, sig));

    expect(mockFireServerTrackers).toHaveBeenCalledWith(
      "orderPaid",
      expect.objectContaining({ id: "order-1" }),
      expect.any(Array)
    );
  });

  // --- Idempotency ---
  it("returns 200 without re-processing if order is already paid", async () => {
    mockGetOrderByPaymentId.mockResolvedValueOnce({
      ...mockOrder,
      status: "paid",
    });

    const sig = sign(paymentSucceededBody);
    const res = await POST(makeWebhookRequest(paymentSucceededBody, sig));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.already_processed).toBe(true);
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled();
  });

  // --- Non-payment events ---
  it("acknowledges non-payment events without processing", async () => {
    const body = JSON.stringify({ type: "refund.created", id: "ref-1" });
    const sig = sign(body);
    const res = await POST(makeWebhookRequest(body, sig));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.received).toBe(true);
    expect(mockGetOrderByPaymentId).not.toHaveBeenCalled();
  });

  // --- Error cases ---
  it("returns 404 when order is not found", async () => {
    mockGetOrderByPaymentId.mockResolvedValueOnce(null);

    const sig = sign(paymentSucceededBody);
    const res = await POST(makeWebhookRequest(paymentSucceededBody, sig));

    expect(res.status).toBe(404);
  });

  it("still returns 200 when notifications fail", async () => {
    mockSendEmail.mockRejectedValueOnce(new Error("SMTP down"));
    mockSendWhatsApp.mockRejectedValueOnce(new Error("WhatsApp down"));

    const sig = sign(paymentSucceededBody);
    const res = await POST(makeWebhookRequest(paymentSucceededBody, sig));

    expect(res.status).toBe(200);
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith("order-1", "paid");
  });
});
