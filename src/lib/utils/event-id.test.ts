import { generateEventId } from "./event-id";

describe("generateEventId", () => {
  it("returns a non-empty string", () => {
    const id = generateEventId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns unique values on each call", () => {
    const id1 = generateEventId();
    const id2 = generateEventId();
    expect(id1).not.toBe(id2);
  });
});
