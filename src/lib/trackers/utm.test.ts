import { extractUtmParams } from "./utm";

describe("extractUtmParams", () => {
  it("extracts all UTM params from URLSearchParams", () => {
    const params = new URLSearchParams({
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "launch",
      utm_content: "ad1",
      utm_term: "buy now",
      src: "my-source",
      sck: "my-sck",
    });

    expect(extractUtmParams(params)).toEqual({
      utm_source: "facebook",
      utm_medium: "cpc",
      utm_campaign: "launch",
      utm_content: "ad1",
      utm_term: "buy now",
      src: "my-source",
      sck: "my-sck",
    });
  });

  it("returns null for missing params", () => {
    const params = new URLSearchParams({});
    const result = extractUtmParams(params);

    expect(result.utm_source).toBeNull();
    expect(result.utm_medium).toBeNull();
    expect(result.utm_campaign).toBeNull();
    expect(result.utm_content).toBeNull();
    expect(result.utm_term).toBeNull();
    expect(result.src).toBeNull();
    expect(result.sck).toBeNull();
  });

  it("ignores unrelated params", () => {
    const params = new URLSearchParams({
      foo: "bar",
      utm_source: "google",
      random: "value",
    });
    const result = extractUtmParams(params);

    expect(result.utm_source).toBe("google");
    expect(result).not.toHaveProperty("foo");
    expect(result).not.toHaveProperty("random");
  });
});
