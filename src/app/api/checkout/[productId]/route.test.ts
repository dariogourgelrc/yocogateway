import { NextRequest } from "next/server";

// --- Mocks ---
const mockProduct = {
  id: "prod-1",
  slug: "test-product",
  name: "Test Product",
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

const mockBumps = [
  {
    id: "bump-1",
    product_id: "prod-1",
    name: "Extra Guide",
    description: "",
    price: 1000,
    image_url: "",
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
];

const mockOrder = {
  id: "order-1",
  product_id: "prod-1",
  yoco_payment_id: null,
  status: "pending" as const,
  buyer_name: "John",
  buyer_email: "john@example.com",
  buyer_phone: "+264811234567",
  total_amount: 5000,
  currency: "NAD",
  tracking_params: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockOrderItems = [
  {
    id: "item-1",
    order_id: "order-1",
    type: "product",
    reference_id: "prod-1",
    name: "Test Product",
    price: 5000,
    created_at: new Date().toISOString(),
  },
];

const mockYocoSession = {
  id: "yoco-session-1",
  redirectUrl: "https://payments.yoco.com/checkout/yoco-session-1",
};

jest.mock("@/lib/db/products", () => ({
  getProductById: jest.fn().mockImplementation((id: string) => {
    if (id === "prod-1") return Promise.resolve(mockProduct);
    throw new Error(`Failed to fetch product by id "${id}": not found`);
  }),
}));

jest.mock("@/lib/db/order-bumps", () => ({
  getOrderBumps: jest.fn().mockResolvedValue(mockBumps),
}));

jest.mock("@/lib/db/product-trackers", () => ({
  getProductTrackers: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/db/orders", () => ({
  createOrder: jest.fn().mockResolvedValue(mockOrder),
}));

jest.mock("@/lib/db/order-items", () => ({
  createOrderItems: jest.fn().mockResolvedValue(mockOrderItems),
}));

jest.mock("@/lib/db/product-offers", () => ({
  getOfferById: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/yoco/create-session", () => ({
  createYocoSession: jest.fn().mockResolvedValue(mockYocoSession),
}));

jest.mock("@/lib/trackers/server-registry", () => ({
  fireServerTrackers: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    from: () => ({
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }),
}));

import { POST } from "./route";
import { createOrder } from "@/lib/db/orders";
import { createYocoSession } from "@/lib/yoco/create-session";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/checkout/prod-1", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  buyer_name: "John Doe",
  buyer_email: "john@example.com",
  buyer_phone: "+264811234567",
  selected_bump_ids: [],
  tracking_params: {
    src: null,
    sck: null,
    utm_source: null,
    utm_campaign: null,
    utm_medium: null,
    utm_content: null,
    utm_term: null,
  },
};

const params = Promise.resolve({ productId: "prod-1" });

beforeEach(() => {
  jest.clearAllMocks();
  (createOrder as jest.Mock).mockResolvedValue(mockOrder);
  (createYocoSession as jest.Mock).mockResolvedValue(mockYocoSession);
});

describe("POST /api/checkout/[productId]", () => {
  // --- Happy path ---
  it("creates order and returns redirect_url on valid request", async () => {
    const res = await POST(makeRequest(validBody), { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.order_id).toBe("order-1");
    expect(json.redirect_url).toBe(mockYocoSession.redirectUrl);
  });

  // --- Validation ---
  it("returns 400 when buyer_name is missing", async () => {
    const res = await POST(
      makeRequest({ ...validBody, buyer_name: "" }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when buyer_email is missing", async () => {
    const res = await POST(
      makeRequest({ ...validBody, buyer_email: "" }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email format", async () => {
    const res = await POST(
      makeRequest({ ...validBody, buyer_email: "not-an-email" }),
      { params }
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid email address");
  });

  it("returns 400 when buyer_phone is missing", async () => {
    const res = await POST(
      makeRequest({ ...validBody, buyer_phone: "" }),
      { params }
    );
    expect(res.status).toBe(400);
  });

  // --- Security: server-side price calculation ---
  it("calculates total server-side, ignoring any client total", async () => {
    const res = await POST(
      makeRequest({ ...validBody, total: 1 }),
      { params }
    );
    expect(res.status).toBe(200);

    // Order should be created with server-calculated price (5000), not client's "1"
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total_amount: 5000 })
    );
  });

  it("includes bump prices in server-side total", async () => {
    const res = await POST(
      makeRequest({ ...validBody, selected_bump_ids: ["bump-1"] }),
      { params }
    );
    expect(res.status).toBe(200);

    // Product (5000) + bump (1000) = 6000
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total_amount: 6000 })
    );
  });

  it("ignores bump IDs that don't belong to this product", async () => {
    const res = await POST(
      makeRequest({
        ...validBody,
        selected_bump_ids: ["bump-from-other-product"],
      }),
      { params }
    );
    expect(res.status).toBe(200);

    // Only product price, no bumps matched
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ total_amount: 5000 })
    );
  });

  // --- Input sanitization ---
  it("trims and lowercases email", async () => {
    const res = await POST(
      makeRequest({ ...validBody, buyer_email: "  John@Example.COM  " }),
      { params }
    );
    expect(res.status).toBe(200);

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ buyer_email: "john@example.com" })
    );
  });

  // --- Error cases ---
  it("returns 500 when product is not found", async () => {
    const notFoundParams = Promise.resolve({ productId: "nonexistent" });
    const res = await POST(makeRequest(validBody), {
      params: notFoundParams,
    });
    expect(res.status).toBe(500);
  });

  it("returns 500 when Yoco API fails", async () => {
    (createYocoSession as jest.Mock).mockRejectedValueOnce(
      new Error("Yoco API down")
    );

    const res = await POST(makeRequest(validBody), { params });
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toContain("Yoco API down");
  });
});
