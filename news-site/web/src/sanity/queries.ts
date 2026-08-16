import type { PortableTextBlock } from "@portabletext/react";

import type { SanityImageSource } from "./image";

export type HeroImage = {
  alt?: string | null;
} & SanityImageSource;

export type ArticleListItem = {
  _id: string;
  headline: string;
  slug: string;
  byline: string | null;
  publishedAt: string | null;
  category: string | null;
  heroImage: HeroImage | null;
};

export type Article = ArticleListItem & {
  body: PortableTextBlock[] | null;
};

/** All articles, newest first. Drafts and slug-less docs are excluded. */
export const ARTICLES_QUERY = `*[
  _type == "article" && defined(slug.current)
] | order(publishedAt desc) {
  _id,
  headline,
  "slug": slug.current,
  byline,
  publishedAt,
  category,
  heroImage
}`;

/** A single article by its slug. */
export const ARTICLE_QUERY = `*[
  _type == "article" && slug.current == $slug
][0] {
  _id,
  headline,
  "slug": slug.current,
  byline,
  publishedAt,
  category,
  heroImage,
  body
}`;
