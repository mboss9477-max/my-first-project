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
    byline: "A. Okonjo",
    publishedAt: "2026-08-17T07:30:00Z",
    category: "World",
  },
  {
    headline: "Assembly debates a four-day week pilot across public services",
    slug: "four-day-week-pilot-debate",
    byline: "M. Lindqvist",
    publishedAt: "2026-08-17T06:10:00Z",
    category: "Politics",
  },
  {
    headline: "Open hardware designs edge into mainstream consumer devices",
    slug: "open-hardware-consumer-devices",
    byline: "R. Nakamura",
    publishedAt: "2026-08-17T05:45:00Z",
    category: "Tech",
  },
  {
    headline: "Tidal engineering, explained in five diagrams",
    slug: "tidal-engineering-explained",
    byline: "S. Adeyemi",
    publishedAt: "2026-08-16T18:20:00Z",
    category: "World",
  },
  {
    headline: "What the pilot means for shift workers",
    slug: "pilot-shift-workers",
    byline: "M. Lindqvist",
    publishedAt: "2026-08-16T17:05:00Z",
    category: "Politics",
  },
  {
    headline: "The small foundries betting on open silicon",
    slug: "small-foundries-open-silicon",
    byline: "R. Nakamura",
    publishedAt: "2026-08-16T15:40:00Z",
    category: "Tech",
  },
  {
    headline: "Container rates settle after a volatile quarter",
    slug: "container-rates-settle",
    byline: "J. Ferreira",
    publishedAt: "2026-08-16T12:00:00Z",
    category: "Business",
  },
  {
    headline: "Regional museums pool collections for a shared touring season",
    slug: "museums-shared-touring-season",
    byline: "H. Bergström",
    publishedAt: "2026-08-15T19:15:00Z",
    category: "Culture",
  },
  {
    headline: "Second-division clubs adopt shared scouting analytics",
    slug: "clubs-shared-scouting-analytics",
    byline: "T. Varga",
    publishedAt: "2026-08-15T16:30:00Z",
    category: "Sport",
  },
  {
    headline: "Grid operators publish hourly carbon intensity as open data",
    slug: "grid-operators-open-data",
    byline: "L. Haddad",
    publishedAt: "2026-08-15T09:50:00Z",
    category: "Tech",
  },
  {
    headline: "Freight rail corridor reopens after two years of repairs",
    slug: "freight-corridor-reopens",
    byline: "J. Ferreira",
    publishedAt: "2026-08-14T14:25:00Z",
    category: "Business",
  },
  {
    headline: "Translators on rendering poetry across four alphabets",
    slug: "translators-poetry-alphabets",
    byline: "N. Rahimi",
    publishedAt: "2026-08-14T08:00:00Z",
    category: "Culture",
  },
];

export const PLACEHOLDER_ARTICLES: PlaceholderArticle[] = DRAFTS.map(
  (draft) => ({
    ...draft,
    _id: `placeholder-${draft.slug}`,
    heroImage: null,
    placeholderImage: `https://picsum.photos/seed/${draft.slug}/1200/800`,
  }),
);
