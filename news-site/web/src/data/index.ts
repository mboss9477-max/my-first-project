/**
 * The data seam: every page, route and component reads content through these
 * functions, never from a CMS client directly. Today they wrap Sanity; when
 * the new backend is ready (plan task 1.9) a second implementation replaces
 * the bodies here and nothing above this layer changes.
 *
 * Stage 1 keeps Sanity's shapes (Portable Text bodies, Sanity image sources).
 * Stage 2 will make images and article bodies CMS-neutral.
 */
import { client } from "@/sanity/client";
import {
  ALL_CATEGORIES_QUERY,
  ARTICLE_QUERY,
  ARTICLE_SLUGS_QUERY,
  ARTICLES_QUERY,
  AUTHOR_QUERY,
  AUTHOR_SLUGS_QUERY,
  CATEGORY_QUERY,
  CATEGORY_SLUGS_QUERY,
  FEED_QUERY,
  NEWS_SITEMAP_QUERY,
  RELATED_ARTICLES_QUERY,
  SEARCH_QUERY,
  SITEMAP_QUERY,
  TOPIC_QUERY,
  TOPIC_SLUGS_QUERY,
  TRENDING_TOPICS_QUERY,
  type Article,
  type ArticleListItem,
  type AuthorWithArticles,
  type Category,
  type CategoryWithArticles,
  type Topic,
  type TopicWithArticles,
} from "@/sanity/queries";

export type {
  Article,
  ArticleListItem,
  Author,
  AuthorWithArticles,
  Category,
  CategoryWithArticles,
  Correction,
  Topic,
  TopicRef,
  TopicWithArticles,
} from "@/sanity/queries";

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

// Articles

export function getLatestArticles(limit: number) {
  return client.fetch<ArticleListItem[]>(ARTICLES_QUERY, { limit });
}

export function getArticle(slug: string) {
  return client.fetch<Article | null>(ARTICLE_QUERY, { slug });
}

export function getArticleSlugs() {
  return client.fetch<string[]>(ARTICLE_SLUGS_QUERY);
}

export function getRelatedArticles(articleId: string, categorySlug: string | null) {
  return client.fetch<ArticleListItem[]>(RELATED_ARTICLES_QUERY, {
    id: articleId,
    categorySlug,
  });
}

/**
 * Search on the given term; an empty term returns nothing. GROQ's `match` is
 * prefix-based per word, so the trailing wildcard makes partial words match.
 */
export async function searchArticles(term: string) {
  if (!term) return [];
  return client.fetch<ArticleListItem[]>(SEARCH_QUERY, { q: `${term}*` });
}

// Taxonomy and authors

export function getAllCategories() {
  return client.fetch<Category[]>(ALL_CATEGORIES_QUERY);
}

export function getCategorySlugs() {
  return client.fetch<string[]>(CATEGORY_SLUGS_QUERY);
}

/** One page of a category listing: articles `from` (inclusive) to `to` (exclusive). */
export function getCategoryPage(slug: string, from: number, to: number) {
  return client.fetch<CategoryWithArticles | null>(CATEGORY_QUERY, { slug, from, to });
}

export function getTrendingTopics() {
  return client.fetch<Topic[]>(TRENDING_TOPICS_QUERY);
}

export function getTopic(slug: string) {
  return client.fetch<TopicWithArticles | null>(TOPIC_QUERY, { slug });
}

export function getTopicSlugs() {
  return client.fetch<string[]>(TOPIC_SLUGS_QUERY);
}

export function getAuthor(slug: string) {
  return client.fetch<AuthorWithArticles | null>(AUTHOR_QUERY, { slug });
}

export function getAuthorSlugs() {
  return client.fetch<string[]>(AUTHOR_SLUGS_QUERY);
}

// Feeds and sitemaps

export function getFeedItems() {
  return client.fetch<FeedItem[]>(FEED_QUERY);
}

export function getNewsSitemapItems(sinceIso: string) {
  return client.fetch<NewsSitemapItem[]>(NEWS_SITEMAP_QUERY, { since: sinceIso });
}

export function getSitemapArticles() {
  return client.fetch<SitemapArticle[]>(SITEMAP_QUERY);
}
