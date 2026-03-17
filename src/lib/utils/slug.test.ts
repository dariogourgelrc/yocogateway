import { generateSlug } from "./slug";

describe("generateSlug", () => {
  it("converts to lowercase kebab-case", () => {
    expect(generateSlug("My Product Name")).toBe("my-product-name");
  });

  it("strips special characters", () => {
    expect(generateSlug("Product with $pecial Ch@rs")).toBe(
      "product-with-dollarpecial-chrs"
    );
  });

  it("trims and collapses spaces", () => {
    expect(generateSlug("  spaces  ")).toBe("spaces");
  });

  it("handles single word", () => {
    expect(generateSlug("Hello")).toBe("hello");
  });
});
