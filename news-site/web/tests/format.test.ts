import { describe, it, expect } from "vitest";
import { formatDate, mastheadDate, siteYear } from "../src/lib/format";

describe("formatDate", () => {
  it("returns null for null or empty input", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("")).toBeNull();
  });

  it("formats ISO datetime string in en-GB long date format", () => {
    expect(formatDate("2026-08-16T10:00:00.000Z")).toBe("16 August 2026");
    expect(formatDate("2026-01-01T00:00:00.000Z")).toBe("1 January 2026");
  });

  it("uses UK time, not the server's time zone", () => {
    // 23:30 UTC on 30 June is 00:30 on 1 July in London (BST, UTC+1).
    expect(formatDate("2026-06-30T23:30:00.000Z")).toBe("1 July 2026");
    // In winter London is on GMT, so the same UTC time stays on the same day.
    expect(formatDate("2026-12-30T23:30:00.000Z")).toBe("30 December 2026");
  });
});

describe("mastheadDate", () => {
  it("keeps month before day", () => {
    expect(mastheadDate(new Date("2026-08-17T09:00:00.000Z"))).toBe("Monday August 17 2026");
  });

  it("rolls over at UK midnight, weekday and date together", () => {
    // 23:30 UTC on Sunday 16 August is 00:30 on Monday 17 August in London.
    expect(mastheadDate(new Date("2026-08-16T23:30:00.000Z"))).toBe("Monday August 17 2026");
  });
});

describe("siteYear", () => {
  it("uses the UK year at New Year", () => {
    // London is on GMT in winter, so 23:30 UTC on 31 December is still 2026.
    expect(siteYear(new Date("2026-12-31T23:30:00.000Z"))).toBe("2026");
    expect(siteYear(new Date("2027-01-01T00:30:00.000Z"))).toBe("2027");
  });
});
