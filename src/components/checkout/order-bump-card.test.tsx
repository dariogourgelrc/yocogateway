import { render, screen, fireEvent } from "@testing-library/react";
import { OrderBumpCard } from "./order-bump-card";
import type { OrderBump } from "@/lib/supabase/types";

const mockBump: OrderBump = {
  id: "bump-1",
  product_id: "prod-1",
  name: "Extra Guide",
  description: "A bonus guide for your purchase",
  price: 1500,
  image_url: "",
  sort_order: 0,
  created_at: new Date().toISOString(),
};

describe("OrderBumpCard", () => {
  it("renders bump name and description", () => {
    render(
      <OrderBumpCard
        bump={mockBump}
        currency="NAD"
        checked={false}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText("Extra Guide")).toBeInTheDocument();
    expect(
      screen.getByText("A bonus guide for your purchase")
    ).toBeInTheDocument();
  });

  it("renders formatted price", () => {
    render(
      <OrderBumpCard
        bump={mockBump}
        currency="NAD"
        checked={false}
        onToggle={jest.fn()}
      />
    );

    expect(screen.getByText("+ N$ 15.00")).toBeInTheDocument();
  });

  it("reflects checked state", () => {
    const { rerender } = render(
      <OrderBumpCard
        bump={mockBump}
        currency="NAD"
        checked={false}
        onToggle={jest.fn()}
      />
    );

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    rerender(
      <OrderBumpCard
        bump={mockBump}
        currency="NAD"
        checked={true}
        onToggle={jest.fn()}
      />
    );

    expect(checkbox.checked).toBe(true);
  });

  it("calls onToggle with bump id when checkbox changes", () => {
    const onToggle = jest.fn();
    render(
      <OrderBumpCard
        bump={mockBump}
        currency="NAD"
        checked={false}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledWith("bump-1");
  });
});
