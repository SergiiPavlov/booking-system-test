import { describe, expect, it } from "vitest";
import { isOverlapping } from "./overlap";

describe("isOverlapping", () => {
  it("detects overlap correctly", () => {
    const aStart = new Date("2026-01-01T10:00:00Z");
    expect(isOverlapping(aStart, 60, new Date("2026-01-01T10:30:00Z"), 30)).toBe(true);
    expect(isOverlapping(aStart, 60, new Date("2026-01-01T11:00:00Z"), 30)).toBe(false);
  });
});
