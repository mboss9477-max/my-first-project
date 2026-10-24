import { describe, it, expect } from "vitest";
import { pageCount, PAGE_SIZE } from "../src/lib/pagination";

describe("pagination", () => {
  it("exports PAGE_SIZE of 10", () => {
    expect(PAGE_SIZE).toBe(10);
  });

  describe("pageCount", () => {
    it("returns at least 1 page for zero or negative items", () => {
      expect(pageCount(0)).toBe(1);
      expect(pageCount(-5)).toBe(1);
    });

    it("returns 1 page when items are less than or equal to PAGE_SIZE", () => {
      expect(pageCount(1)).toBe(1);
      expect(pageCount(5)).toBe(1);
      expect(pageCount(10)).toBe(1);
    });

    it("calculates multiple pages correctly", () => {
      expect(pageCount(11)).toBe(2);
      expect(pageCount(20)).toBe(2);
      expect(pageCount(21)).toBe(3);
      expect(pageCount(100)).toBe(10);
    });
  });
});
