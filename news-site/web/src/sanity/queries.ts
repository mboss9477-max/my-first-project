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
  categorySlug: string | null;
  heroImage: HeroImage | null;
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
};

export type CategoryWithArticles = Category & {
  articles: ArticleListItem[];
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

/** Shared card projection, so every list of articles has the same shape. */
const ARTICLE_CARD_FIELDS = `
  _id,
  headline,
  "slug": slug.current,
  excerpt,
  byline,
  publishedAt,
  "category": category->name,
  "categorySlug": category->slug.current,
  ${HERO_IMAGE}`;

/** All articles, newest first. Drafts and slug-less docs are excluded. */
export const ARTICLES_QUERY = `*[
  _type == "article" && defined(slug.current)
] | order(publishedAt desc) {${ARTICLE_CARD_FIELDS}
}`;

/** Every category, for the header nav and footer browse column. */
export const ALL_CATEGORIES_QUERY = `*[
  _type == "category" && defined(slug.current)
] | order(name asc) {
  _id,
  name,
  "slug": slug.current
}`;

/** Category slugs, for prerendering the category routes. */
export const CATEGORY_SLUGS_QUERY = `*[
  _type == "category" && defined(slug.current)
].slug.current`;

/** One category plus its articles, newest first. */
export const CATEGORY_QUERY = `*[
  _type == "category" && slug.current == $slug
][0]{
  _id,
  name,
  "slug": slug.current,
  "articles": *[
    _type == "article" && defined(slug.current) && category._ref == ^._id
  ] | order(publishedAt desc) {${ARTICLE_CARD_FIELDS}
  }
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
][0] {${ARTICLE_CARD_FIELDS},
  body[]{
    ...,
    _type == "image" => {
      "dimensions": asset->metadata.dimensions{width, height}
    }
  }
}`;
