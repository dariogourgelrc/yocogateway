import { render, screen } from "@testing-library/react";
import { OrderSummary } from "./order-summary";
import type { Product, OrderBump } from "@/lib/supabase/types";

const mockProduct: Product = {
  id: "prod-1",
  user_id: null,
  slug: "test",
  name: "Test Product",
  description: "",
  price: 5000,
  currency: "NAD",
  image_url: "https://example.com/img.jpg",
  delivery_url: "",
  upsell_url: null,
  back_redirect_url: null,
  regional_pricing: {},
  remarketing_enabled: false,
  remarketing_offer_1: null,
  remarketing_offer_2: null,
  remarketing_offer_3: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockBump: OrderBump = {
  id: "bump-1",
  product_id: "prod-1",
  name: "Extra Guide",
  description: "",
  price: 1500,
  image_url: "",
  sort_order: 0,
  created_at: new Date().toISOString(),
};

describe("OrderSummary", () => {
  it("shows product subtotal", () => {
    render(
      <OrderSummary product={mockProduct} selectedBumps={[]} total={5000} />
    );

    // Subtotal and Total both show N$ 50.00 when no bumps selected
    const prices = screen.getAllByText("N$ 50.00");
    expect(prices.length).toBe(2);
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
  });

  it("shows selected bump prices", () => {
    render(
      <OrderSummary
        product={mockProduct}
        selectedBumps={[mockBump]}
        total={6500}
      />
    );

    expect(screen.getByText("Extra Guide")).toBeInTheDocument();
    expect(screen.getByText("N$ 15.00")).toBeInTheDocument();
  });

  it("shows correct total", () => {
    render(
      <OrderSummary
        product={mockProduct}
        selectedBumps={[mockBump]}
        total={6500}
      />
    );

    expect(screen.getByText("N$ 65.00")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("shows no bumps when none selected", () => {
    render(
      <OrderSummary product={mockProduct} selectedBumps={[]} total={5000} />
    );

    expect(screen.queryByText("Extra Guide")).not.toBeInTheDocument();
  });
});
