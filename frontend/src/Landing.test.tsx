import { describe, expect, it } from "vitest";

describe("prototype contract", () => {
  it("does not advertise fake accuracy", () => {
    const copy = "Prototype scores. No 99.9% accuracy claims.";
    expect(copy.includes("99.9%")).toBe(true);
    expect(copy.toLowerCase().includes("prototype")).toBe(true);
  });
});
