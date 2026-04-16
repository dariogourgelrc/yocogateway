import type {
  ProductTracker,
  OrderWithItems,
  ServerTrackerProvider,
} from "@/lib/supabase/types";

const mockOnOrderCreated = jest.fn().mockResolvedValue(undefined);
const mockOnOrderPaid = jest.fn().mockResolvedValue(undefined);

jest.mock("./providers/facebook-capi", () => ({
  FacebookCAPITracker: {
    type: "facebook",
    onOrderCreated: (...args: unknown[]) => mockOnOrderCreated(...args),
    onOrderPaid: (...args: unknown[]) => mockOnOrderPaid(...args),
  } satisfies ServerTrackerProvider,
}));

jest.mock("./providers/utmify", () => ({
  UTMifyTracker: {
    type: "utmify",
    onOrderCreated: jest.fn().mockResolvedValue(undefined),
    onOrderPaid: jest.fn().mockResolvedValue(undefined),
  } satisfies ServerTrackerProvider,
}));

import { fireServerTrackers } from "./server-registry";

const makeOrder = (): OrderWithItems => ({
  id: "order-1",
  product_id: "prod-1",
  yoco_payment_id: "yoco-1",
  status: "pending",
  buyer_name: "John",
  buyer_email: "john@example.com",
  buyer_phone: "+264811234567",
  total_amount: 5000,
  currency: "NAD",
  tracking_params: {
    src: null,
    sck: null,
    utm_source: null,
    utm_campaign: null,
    utm_medium: null,
    utm_content: null,
    utm_term: null,
  },
  shipping_address: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  order_items: [],
});

const makeTracker = (
  overrides: Partial<ProductTracker> = {}
): ProductTracker => ({
  id: "t1",
  product_id: "prod-1",
  type: "facebook",
  tracker_id: "token123",
  side: "server",
  config: { access_token: "secret" },
  created_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("fireServerTrackers", () => {
  it("resolves without error for empty configs", async () => {
    await expect(
      fireServerTrackers("orderCreated", makeOrder(), [])
    ).resolves.not.toThrow();
  });

  it("calls onOrderPaid on matching server providers", async () => {
    const order = makeOrder();
    const tracker = makeTracker();

    await fireServerTrackers("orderPaid", order, [tracker]);

    expect(mockOnOrderPaid).toHaveBeenCalledWith(order, tracker);
    expect(mockOnOrderCreated).not.toHaveBeenCalled();
  });

  it("calls onOrderCreated on matching server providers", async () => {
    const order = makeOrder();
    const tracker = makeTracker();

    await fireServerTrackers("orderCreated", order, [tracker]);

    expect(mockOnOrderCreated).toHaveBeenCalledWith(order, tracker);
  });

  it("filters out client-side trackers", async () => {
    const clientTracker = makeTracker({ side: "client" });
    await fireServerTrackers("orderPaid", makeOrder(), [clientTracker]);

    expect(mockOnOrderPaid).not.toHaveBeenCalled();
  });

  it("continues firing other trackers if one throws", async () => {
    mockOnOrderPaid.mockRejectedValueOnce(new Error("FB API down"));

    const { UTMifyTracker } = jest.requireMock("./providers/utmify") as {
      UTMifyTracker: ServerTrackerProvider;
    };

    const trackers = [
      makeTracker({ id: "t1", type: "facebook" }),
      makeTracker({ id: "t2", type: "utmify" }),
    ];

    // Should not throw even though facebook failed
    await expect(
      fireServerTrackers("orderPaid", makeOrder(), trackers)
    ).resolves.not.toThrow();

    // UTMify should still have been called
    expect(UTMifyTracker.onOrderPaid).toHaveBeenCalled();
  });
});
