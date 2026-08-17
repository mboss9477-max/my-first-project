/** Single place to change the masthead name — it appears in the header,
 *  footer, and page metadata. */
export const SITE_NAME = "CS NEWS";

/** Compact mark for the utility bar, where the full wordmark is too wide. */
export const SITE_MONOGRAM = "CSN";

export const SITE_TAGLINE = "Independent reporting from around the world.";

/**
 * Absolute origin, used for canonical URLs, Open Graph URLs, the sitemap and
 * robots.txt.
 *
 * MUST be set to the real domain before deploying — otherwise canonical tags
 * and the sitemap will publish localhost URLs, which search engines will either
 * ignore or index wrongly. Set NEXT_PUBLIC_SITE_URL in the hosting environment.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const NAV_CATEGORIES = ["World", "Politics", "Tech", "Business"];

/** Placeholder until routing by section exists. */
export const ACTIVE_CATEGORY = "World";
