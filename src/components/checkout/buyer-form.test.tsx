import { render, screen, fireEvent } from "@testing-library/react";
import { BuyerForm, type BuyerInfo } from "./buyer-form";

const defaultValue: BuyerInfo = { name: "", email: "", phone: "" };

describe("BuyerForm", () => {
  it("renders name, email, and phone fields", () => {
    render(<BuyerForm value={defaultValue} onChange={jest.fn()} />);

    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("john@example.com")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("+264 81 123 4567")
    ).toBeInTheDocument();
  });

  it("displays error messages when provided", () => {
    render(
      <BuyerForm
        value={defaultValue}
        onChange={jest.fn()}
        errors={{ email: "Invalid email" }}
      />
    );

    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("calls onChange with updated values when fields change", () => {
    const onChange = jest.fn();
    render(<BuyerForm value={defaultValue} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("John Doe"), {
      target: { value: "Jane" },
    });

    expect(onChange).toHaveBeenCalledWith({
      name: "Jane",
      email: "",
      phone: "",
    });
  });

  it("calls onChange for email field", () => {
    const onChange = jest.fn();
    render(<BuyerForm value={defaultValue} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText("john@example.com"), {
      target: { value: "test@test.com" },
    });

    expect(onChange).toHaveBeenCalledWith({
      name: "",
      email: "test@test.com",
      phone: "",
    });
  });
});
