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
 * Defaults to the production domain deliberately: canonical tags should point
 * at the real site from every environment, and a wrong-but-real domain is far
 * safer to publish than localhost. Override with NEXT_PUBLIC_SITE_URL only for
 * preview deployments that need to self-reference.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://csnews.news";

export const NAV_CATEGORIES = ["World", "Politics", "Tech", "Business"];

/** Placeholder until routing by section exists. */
export const ACTIVE_CATEGORY = "World";
