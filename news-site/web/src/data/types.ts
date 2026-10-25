/**
 * The shapes pages and components receive, whichever backend produced them.
 * Sanity and the new CMS each map their own records into these.
 */
import type { PortableTextBlock } from "@portabletext/react";
import type { SanityImageSource } from "@sanity/image-url";

import type {
  Article as SanityArticle,
  ArticleListItem as SanityArticleListItem,
  Author as SanityAuthor,
  AuthorWithArticles as SanityAuthorWithArticles,
  CategoryWithArticles as SanityCategoryWithArticles,
  HeroImage,
  TopicWithArticles as SanityTopicWithArticles,
} from "@/sanity/queries";
import type { ImageDimensions } from "@/sanity/image";

export type {
  Category,
  Correction,
  Topic,
  TopicRef,
} from "@/sanity/queries";

/**
 * An image served by the new CMS: the same descriptive fields Sanity images
 * carry, plus the list of pre-generated sizes (ascending width, absolute URLs).
 */
export type CmsImage = {
  alt: string | null;
  caption: string | null;
  crop: null;
  dimensions: ImageDimensions | null;
  lqip: string | null;
  cms: { sizes: { width: number; url: string }[] };
};

/** What a page may ask `imageUrl()` to size. */
export type ImageSource = SanityImageSource | CmsImage;

/** A hero or inline image, from either backend. */
export type ContentImage = HeroImage | CmsImage;

/** A node of Lexical's saved editor state, as the CMS stores it. */
export type LexicalNode = {
  type: string;
  children?: LexicalNode[];
  text?: string;
  format?: number | string;
  tag?: string;
  listType?: string;
  fields?: Record<string, unknown>;
  /** Set on `upload` nodes by the data layer: the image the node points at. */
  image?: CmsImage | null;
};

/** An article body in whichever format the backend stores it. */
export type ArticleBodyData =
  | { format: "portableText"; blocks: PortableTextBlock[] }
  | { format: "lexical"; root: LexicalNode };

export type ArticleListItem = Omit<SanityArticleListItem, "heroImage"> & {
  heroImage: ContentImage | null;
};

export type Article = Omit<SanityArticle, "heroImage" | "body"> & {
  heroImage: ContentImage | null;
  body: ArticleBodyData | null;
};

export type Author = Omit<SanityAuthor, "image"> & { image: ImageSource | null };

export type AuthorWithArticles = Omit<
  SanityAuthorWithArticles,
  "image" | "articles"
> & {
  image: ImageSource | null;
  articles: ArticleListItem[];
};

export type CategoryWithArticles = Omit<SanityCategoryWithArticles, "articles"> & {
  articles: ArticleListItem[];
};

export type TopicWithArticles = Omit<SanityTopicWithArticles, "articles"> & {
  articles: ArticleListItem[];
};

export type FeedItem = {
  headline: string;
  slug: string;
  excerpt: string | null;
  byline: string | null;
  publishedAt: string | null;
  category: string | null;
};

export type NewsSitemapItem = {
  headline: string;
  slug: string;
  publishedAt: string | null;
};

export type SitemapArticle = { slug: string; publishedAt: string | null };

/** Everything a backend must provide. `data/index.ts` picks one. */
export interface ContentSource {
  getLatestArticles(limit: number): Promise<ArticleListItem[]>;
  getArticle(slug: string): Promise<Article | null>;
  getArticleSlugs(): Promise<string[]>;
  getRelatedArticles(
    articleId: string,
    categorySlug: string | null,
  ): Promise<ArticleListItem[]>;
  searchArticles(term: string): Promise<ArticleListItem[]>;
  getAllCategories(): Promise<import("@/sanity/queries").Category[]>;
  getCategorySlugs(): Promise<string[]>;
  getCategoryPage(
    slug: string,
    from: number,
    to: number,
  ): Promise<CategoryWithArticles | null>;
  getTrendingTopics(): Promise<import("@/sanity/queries").Topic[]>;
  getTopic(slug: string): Promise<TopicWithArticles | null>;
  getTopicSlugs(): Promise<string[]>;
  getAuthor(slug: string): Promise<AuthorWithArticles | null>;
  getAuthorSlugs(): Promise<string[]>;
  getFeedItems(): Promise<FeedItem[]>;
  getNewsSitemapItems(sinceIso: string): Promise<NewsSitemapItem[]>;
  getSitemapArticles(): Promise<SitemapArticle[]>;
}
