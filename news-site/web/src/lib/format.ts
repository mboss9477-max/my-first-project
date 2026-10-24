import { SITE_TIME_ZONE } from "@/lib/site";

/** Renders a Sanity datetime as e.g. "16 August 2026", in UK time. */
export function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SITE_TIME_ZONE,
  });
}

/**
 * Masthead date, e.g. "Monday August 17 2026" — built explicitly to keep
 * month-before-day. Every part comes from one UK-time formatter, so the
 * weekday, day and year cannot disagree around midnight.
 */
export function mastheadDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: SITE_TIME_ZONE,
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")} ${part("month")} ${part("day")} ${part("year")}`;
}

/** The current year in UK time, for the copyright line. */
export function siteYear(now = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    timeZone: SITE_TIME_ZONE,
  }).format(now);
}
