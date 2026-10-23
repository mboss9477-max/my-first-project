import { describe, it, expect } from "vitest";
import { formatDate } from "../src/lib/format";

describe("formatDate", () => {
  it("returns null for null or empty input", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("")).toBeNull();
  });

  it("formats ISO datetime string in en-GB long date format", () => {
    expect(formatDate("2026-08-16T10:00:00.000Z")).toBe("16 August 2026");
    expect(formatDate("2026-01-01T00:00:00.000Z")).toBe("1 January 2026");
  });
});
