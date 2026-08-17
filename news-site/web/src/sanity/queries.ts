import type { PortableTextBlock } from "@portabletext/react";
import type { SanityImageSource } from "@sanity/image-url";

import type { ImageDimensions } from "./image";

type HeroImage = SanityImageSource & {
  alt?: string | null;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  dimensions: ImageDimensions | null;
};

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
  byline,
  publishedAt,
  category,
  ${HERO_IMAGE}
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
  ${HERO_IMAGE},
  body[]{
    ...,
    _type == "image" => {
      "dimensions": asset->metadata.dimensions{width, height}
    }
  }
}`;
