import type { PortableTextBlock } from "@portabletext/react";
import type { SanityImageSource } from "@sanity/image-url";

import type { ImageDimensions } from "./image";

type HeroImage = SanityImageSource & {
  alt?: string | null;
  caption?: string | null;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  dimensions: ImageDimensions | null;
};

export type ArticleListItem = {
  _id: string;
  headline: string;
  slug: string;
  excerpt: string | null;
  byline: string | null;
  publishedAt: string | null;
  /** Dereferenced from the `category` document so consumers still see a name. */
  category: string | null;
  heroImage: HeroImage | null;
};

export type Article = ArticleListItem & {
  body: PortableTextBlock[] | null;
};

/**
 * Keeps the image object intact (asset ref, hotspot, crop) and pulls the
 * asset's real pixel dimensions so pages can reserve the right aspect ratio.
 */
const HERO_IMAGE = `heroImage{
    ...,
    "dimensions": asset->metadata.dimensions{width, height}
  }`;

/** All articles, newest first. Drafts and slug-less docs are excluded. */
export const ARTICLES_QUERY = `*[
  _type == "article" && defined(slug.current)
] | order(publishedAt desc) {
  _id,
  headline,
  "slug": slug.current,
  excerpt,
  byline,
  publishedAt,
  "category": category->name,
  ${HERO_IMAGE}
}`;

/** Slugs only — used by generateStaticParams to prerender article routes. */
export const ARTICLE_SLUGS_QUERY = `*[
  _type == "article" && defined(slug.current)
].slug.current`;

/** Minimal projection for sitemap entries. */
export const SITEMAP_QUERY = `*[
  _type == "article" && defined(slug.current)
] | order(publishedAt desc) {
  "slug": slug.current,
  publishedAt
}`;

/** A single article by its slug. */
export const ARTICLE_QUERY = `*[
  _type == "article" && slug.current == $slug
][0] {
  _id,
  headline,
  "slug": slug.current,
  excerpt,
  byline,
  publishedAt,
  "category": category->name,
  ${HERO_IMAGE},
  body[]{
    ...,
    _type == "image" => {
      "dimensions": asset->metadata.dimensions{width, height}
    }
  }
}`;
