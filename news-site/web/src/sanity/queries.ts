import type { PortableTextBlock } from "@portabletext/react";
import type { SanityImageSource } from "@sanity/image-url";

import type { ImageDimensions } from "./image";

type HeroImage = SanityImageSource & {
  alt?: string | null;
  caption?: string | null;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  dimensions: ImageDimensions | null;
  /** Tiny base64 preview, used as the blur placeholder. */
  lqip: string | null;
};

export type TopicRef = {
  name: string;
  slug: string;
};

export type ArticleListItem = {
  _id: string;
  headline: string;
  slug: string;
  excerpt: string | null;
  /** Author name, falling back to the byline override for guest writers. */
  byline: string | null;
  authorSlug: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  /** Dereferenced from the `category` document so consumers still see a name. */
  category: string | null;
  categorySlug: string | null;
  topics: TopicRef[] | null;
  featured: boolean | null;
  heroImage: HeroImage | null;
};

export type Correction = {
  correctedAt: string;
  note: string;
};

export type Article = ArticleListItem & {
  body: PortableTextBlock[] | null;
  corrections: Correction[] | null;
  authorRole: string | null;
  authorBio: string | null;
};

export type Category = {
  _id: string;
  name: string;
  slug: string;
};

export type CategoryWithArticles = Category & {
  total: number;
  articles: ArticleListItem[];
};

export type Author = {
  _id: string;
  name: string;
  slug: string;
  role: string | null;
  bio: string | null;
  image: SanityImageSource | null;
};

export type AuthorWithArticles = Author & {
  articles: ArticleListItem[];
};

export type Topic = {
  _id: string;
  name: string;
  slug: string;
};

export type TopicWithArticles = Topic & {
  articles: ArticleListItem[];
};

/**
 * Keeps the image object intact (asset ref, hotspot, crop), plus the asset's
 * real pixel dimensions so pages can reserve the right aspect ratio, and the
 * LQIP so images can blur up instead of popping in.
 */
const HERO_IMAGE = `heroImage{
    ...,
    "dimensions": asset->metadata.dimensions{width, height},
    "lqip": asset->metadata.lqip
  }`;

/** Shared card projection, so every list of articles has the same shape. */
const ARTICLE_CARD_FIELDS = `
  _id,
  headline,
  "slug": slug.current,
  excerpt,
  "byline": coalesce(author->name, byline),
  "authorSlug": author->slug.current,
  publishedAt,
  updatedAt,
  "category": category->name,
  "categorySlug": category->slug.current,
  "topics": topics[]->{name, "slug": slug.current},
  featured,
  ${HERO_IMAGE}`;

const PUBLISHED_ARTICLE = `_type == "article" && defined(slug.current)`;

/**
 * Front page ordering: featured stories first, then by date. Bounded, because
 * the homepage only ever renders a fixed number of slots.
 */
export const ARTICLES_QUERY = `*[${PUBLISHED_ARTICLE}]
  | order(featured desc, publishedAt desc)[0...$limit] {${ARTICLE_CARD_FIELDS}
}`;

/** Every category, for the header nav and footer browse column. */
export const ALL_CATEGORIES_QUERY = `*[
  _type == "category" && defined(slug.current)
] | order(name asc) {
  _id,
  name,
  "slug": slug.current
}`;

/** Topics flagged for the header Trending strip. */
export const TRENDING_TOPICS_QUERY = `*[
  _type == "topic" && trending == true && defined(slug.current)
] | order(name asc)[0...4] {
  _id,
  name,
  "slug": slug.current
}`;

export const CATEGORY_SLUGS_QUERY = `*[
  _type == "category" && defined(slug.current)
].slug.current`;

export const AUTHOR_SLUGS_QUERY = `*[
  _type == "author" && defined(slug.current)
].slug.current`;

export const TOPIC_SLUGS_QUERY = `*[
  _type == "topic" && defined(slug.current)
].slug.current`;

/** One category plus a page of its articles. */
export const CATEGORY_QUERY = `*[
  _type == "category" && slug.current == $slug
][0]{
  _id,
  name,
  "slug": slug.current,
  "total": count(*[${PUBLISHED_ARTICLE} && category._ref == ^._id]),
  "articles": *[
    ${PUBLISHED_ARTICLE} && category._ref == ^._id
  ] | order(publishedAt desc)[$from...$to] {${ARTICLE_CARD_FIELDS}
  }
}`;

export const AUTHOR_QUERY = `*[
  _type == "author" && slug.current == $slug
][0]{
  _id,
  name,
  "slug": slug.current,
  role,
  bio,
  image,
  "articles": *[
    ${PUBLISHED_ARTICLE} && author._ref == ^._id
  ] | order(publishedAt desc)[0...50] {${ARTICLE_CARD_FIELDS}
  }
}`;

export const TOPIC_QUERY = `*[
  _type == "topic" && slug.current == $slug
][0]{
  _id,
  name,
  "slug": slug.current,
  "articles": *[
    ${PUBLISHED_ARTICLE} && ^._id in topics[]._ref
  ] | order(publishedAt desc)[0...50] {${ARTICLE_CARD_FIELDS}
  }
}`;

/** Free-text search across headline, excerpt and body. */
export const SEARCH_QUERY = `*[
  ${PUBLISHED_ARTICLE} && (
    headline match $q ||
    excerpt match $q ||
    pt::text(body) match $q
  )
] | order(publishedAt desc)[0...40] {${ARTICLE_CARD_FIELDS}
}`;

/** A single article by its slug. */
export const ARTICLE_QUERY = `*[
  _type == "article" && slug.current == $slug
][0] {${ARTICLE_CARD_FIELDS},
  "authorRole": author->role,
  "authorBio": author->bio,
  corrections[]{correctedAt, note},
  body[]{
    ...,
    _type == "image" => {
      "dimensions": asset->metadata.dimensions{width, height},
      "lqip": asset->metadata.lqip
    }
  }
}`;

/** More from the same section, excluding the article being read. */
export const RELATED_ARTICLES_QUERY = `*[
  ${PUBLISHED_ARTICLE}
  && _id != $id
  && category->slug.current == $categorySlug
] | order(publishedAt desc)[0...3] {${ARTICLE_CARD_FIELDS}
}`;

export const ARTICLE_SLUGS_QUERY = `*[${PUBLISHED_ARTICLE}].slug.current`;

/** Minimal projection for sitemap entries. */
export const SITEMAP_QUERY = `*[${PUBLISHED_ARTICLE}]
  | order(publishedAt desc) {
  "slug": slug.current,
  publishedAt,
  updatedAt
}`;

/** Full records for the RSS feed. */
export const FEED_QUERY = `*[${PUBLISHED_ARTICLE}]
  | order(publishedAt desc)[0...50] {
  headline,
  "slug": slug.current,
  excerpt,
  "byline": coalesce(author->name, byline),
  publishedAt,
  "category": category->name
}`;

/**
 * Google News only indexes the last two days, so the news sitemap is
 * deliberately narrow.
 */
export const NEWS_SITEMAP_QUERY = `*[
  ${PUBLISHED_ARTICLE} && publishedAt > $since
] | order(publishedAt desc)[0...1000] {
  headline,
  "slug": slug.current,
  publishedAt
}`;
