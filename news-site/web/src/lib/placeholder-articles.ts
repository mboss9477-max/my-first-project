import type { ArticleListItem } from "@/sanity/queries";

/**
 * PLACEHOLDER CONTENT — not real reporting, not from Sanity.
 *
 * The homepage falls back to this list only while the Sanity dataset is empty,
 * so the layout can be designed and reviewed before any articles exist. As soon
 * as one article is published, real content replaces all of this.
 *
 * Images come from picsum.photos, seeded by slug so each article keeps the same
 * photo between renders. Safe to delete this file (and the fallback in
 * src/app/page.tsx) once the dataset has content.
 */
export type PlaceholderArticle = ArticleListItem & {
  placeholderImage: string;
};

const DRAFTS = [
  {
    headline: "Coastal cities trial floating parks to absorb tidal surges",
    slug: "coastal-cities-floating-parks",
    excerpt:
      "Four port authorities are testing anchored green platforms that rise with the water. Early results suggest they blunt storm surges while adding public space.",
    byline: "A. Okonjo",
    publishedAt: "2026-08-17T07:30:00Z",
    category: "World",
  },
  {
    headline: "Assembly debates a four-day week pilot across public services",
    slug: "four-day-week-pilot-debate",
    excerpt:
      "The proposal would cover roughly 40,000 staff for eighteen months, with no reduction in pay. Opponents question how frontline cover would be maintained.",
    byline: "M. Lindqvist",
    publishedAt: "2026-08-17T06:10:00Z",
    category: "Politics",
  },
  {
    headline: "Open hardware designs edge into mainstream consumer devices",
    slug: "open-hardware-consumer-devices",
    excerpt:
      "Two mid-tier manufacturers have shipped products built on openly licensed chip designs, a first outside hobbyist and research markets.",
    byline: "R. Nakamura",
    publishedAt: "2026-08-17T05:45:00Z",
    category: "Tech",
  },
  {
    headline: "Tidal engineering, explained in five diagrams",
    slug: "tidal-engineering-explained",
    excerpt:
      "How floating breakwaters, tidal gates and managed marshland each handle a surge, and where the trade-offs lie.",
    byline: "S. Adeyemi",
    publishedAt: "2026-08-16T18:20:00Z",
    category: "World",
  },
  {
    headline: "What the pilot means for shift workers",
    slug: "pilot-shift-workers",
    excerpt:
      "Rota-based roles are the hardest case for a shorter week. Three services that already tried it describe what changed.",
    byline: "M. Lindqvist",
    publishedAt: "2026-08-16T17:05:00Z",
    category: "Politics",
  },
  {
    headline: "The small foundries betting on open silicon",
    slug: "small-foundries-open-silicon",
    excerpt:
      "Older fabrication lines are finding new demand from open designs that do not need leading-edge processes.",
    byline: "R. Nakamura",
    publishedAt: "2026-08-16T15:40:00Z",
    category: "Tech",
  },
  {
    headline: "Container rates settle after a volatile quarter",
    slug: "container-rates-settle",
    excerpt:
      "Spot prices on the main east-west routes have returned to roughly where they began the year, easing pressure on importers.",
    byline: "J. Ferreira",
    publishedAt: "2026-08-16T12:00:00Z",
    category: "Business",
  },
  {
    headline: "Regional museums pool collections for a shared touring season",
    slug: "museums-shared-touring-season",
    excerpt:
      "Eleven institutions will circulate works between them rather than borrowing from national collections, cutting insurance and transport costs.",
    byline: "H. Bergström",
    publishedAt: "2026-08-15T19:15:00Z",
    category: "Culture",
  },
  {
    headline: "Second-division clubs adopt shared scouting analytics",
    slug: "clubs-shared-scouting-analytics",
    excerpt:
      "A jointly funded data platform gives smaller clubs access to match analysis that had been priced out of reach.",
    byline: "T. Varga",
    publishedAt: "2026-08-15T16:30:00Z",
    category: "Sport",
  },
  {
    headline: "Grid operators publish hourly carbon intensity as open data",
    slug: "grid-operators-open-data",
    excerpt:
      "The feed lets appliances and industrial users shift demand toward cleaner hours. Two operators have committed to five-minute resolution next year.",
    byline: "L. Haddad",
    publishedAt: "2026-08-15T09:50:00Z",
    category: "Tech",
  },
  {
    headline: "Freight rail corridor reopens after two years of repairs",
    slug: "freight-corridor-reopens",
    excerpt:
      "The route carries roughly a fifth of the region's bulk freight. Operators expect capacity to return gradually over the autumn.",
    byline: "J. Ferreira",
    publishedAt: "2026-08-14T14:25:00Z",
    category: "Business",
  },
  {
    headline: "Translators on rendering poetry across four alphabets",
    slug: "translators-poetry-alphabets",
    excerpt:
      "Six translators describe what survives a change of script, and what has to be rebuilt from scratch.",
    byline: "N. Rahimi",
    publishedAt: "2026-08-14T08:00:00Z",
    category: "Culture",
  },
];

export const PLACEHOLDER_ARTICLES: PlaceholderArticle[] = DRAFTS.map(
  (draft) => ({
    ...draft,
    _id: `placeholder-${draft.slug}`,
    categorySlug: draft.category.toLowerCase(),
    heroImage: null,
    placeholderImage: `https://picsum.photos/seed/${draft.slug}/1200/800`,
  }),
);
