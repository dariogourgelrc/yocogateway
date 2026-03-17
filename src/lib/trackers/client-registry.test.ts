import type { ProductTracker, ClientTrackerProvider } from "@/lib/supabase/types";

// Mock the facebook-pixel provider
const mockInit = jest.fn();
const mockPageView = jest.fn();
const mockInitiateCheckout = jest.fn();
const mockPurchase = jest.fn();

jest.mock("./providers/facebook-pixel", () => ({
  FacebookPixelTracker: {
    type: "facebook",
    init: (...args: unknown[]) => mockInit(...args),
    pageView: (...args: unknown[]) => mockPageView(...args),
    initiateCheckout: (...args: unknown[]) => mockInitiateCheckout(...args),
    purchase: (...args: unknown[]) => mockPurchase(...args),
  } satisfies ClientTrackerProvider,
}));

import { createTrackerManager } from "./client-registry";

const makeTracker = (
  overrides: Partial<ProductTracker> = {}
): ProductTracker => ({
  id: "t1",
  product_id: "p1",
  type: "facebook",
  tracker_id: "PIXEL123",
  side: "client",
  config: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createTrackerManager", () => {
  it("handles empty configs without throwing", () => {
    const manager = createTrackerManager([]);
    expect(() => manager.pageView()).not.toThrow();
    expect(() =>
      manager.initiateCheckout({
        product_name: "Test",
        value: 100,
        currency: "NAD",
      })
    ).not.toThrow();
    expect(() =>
      manager.purchase({
        product_name: "Test",
        value: 100,
        currency: "NAD",
        order_id: "o1",
        event_id: "e1",
      })
    ).not.toThrow();
  });

  it("initializes and calls methods on a client tracker", () => {
    const tracker = makeTracker();
    const manager = createTrackerManager([tracker]);

    expect(mockInit).toHaveBeenCalledWith("PIXEL123");

    manager.pageView();
    expect(mockPageView).toHaveBeenCalledTimes(1);

    const checkoutData = {
      product_name: "Test",
      value: 500,
      currency: "ZAR",
    };
    manager.initiateCheckout(checkoutData);
    expect(mockInitiateCheckout).toHaveBeenCalledWith(checkoutData);

    const purchaseData = {
      ...checkoutData,
      order_id: "o1",
      event_id: "e1",
    };
    manager.purchase(purchaseData);
    expect(mockPurchase).toHaveBeenCalledWith(purchaseData);
  });

  it("filters out server-side trackers", () => {
    const serverTracker = makeTracker({ side: "server" });
    const manager = createTrackerManager([serverTracker]);

    expect(mockInit).not.toHaveBeenCalled();
    manager.pageView();
    expect(mockPageView).not.toHaveBeenCalled();
  });
});
