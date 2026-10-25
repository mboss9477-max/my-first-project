/**
 * Sanity implementation of the data seam (the legacy backend). Behaviour is
 * unchanged from before the seam had two implementations; article bodies are
 * wrapped as `{ format: "portableText" }` so the renderer can tell them apart
 * from the CMS's Lexical bodies.
 */
import { client, writeClient } from "@/sanity/client";
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
  type Article as SanityArticle,
  type Category,
  type Topic,
} from "@/sanity/queries";

import type {
  Article,
  ArticleListItem,
  AuthorWithArticles,
  CategoryWithArticles,
  ContentSource,
  FeedItem,
  NewsSitemapItem,
  SitemapArticle,
  TopicWithArticles,
} from "./types";

export const sanitySource: ContentSource = {
  // Articles

  getLatestArticles(limit) {
    return client.fetch<ArticleListItem[]>(ARTICLES_QUERY, { limit });
  },

  async getArticle(slug) {
    const row = await client.fetch<SanityArticle | null>(ARTICLE_QUERY, { slug });
    if (!row) return null;
    const { body, ...rest } = row;
    const article: Article = {
      ...rest,
      body: body ? { format: "portableText", blocks: body } : null,
    };
    return article;
  },

  getArticleSlugs() {
    return client.fetch<string[]>(ARTICLE_SLUGS_QUERY);
  },

  getRelatedArticles(articleId, categorySlug) {
    return client.fetch<ArticleListItem[]>(RELATED_ARTICLES_QUERY, {
      id: articleId,
      categorySlug,
    });
  },

  /**
   * Search on the given term; an empty term returns nothing. GROQ's `match` is
   * prefix-based per word, so the trailing wildcard makes partial words match.
   */
  async searchArticles(term) {
    if (!term) return [];
    return client.fetch<ArticleListItem[]>(SEARCH_QUERY, { q: `${term}*` });
  },

  // Taxonomy and authors

  getAllCategories() {
    return client.fetch<Category[]>(ALL_CATEGORIES_QUERY);
  },

  getCategorySlugs() {
    return client.fetch<string[]>(CATEGORY_SLUGS_QUERY);
  },

  /** One page of a category listing: articles `from` (inclusive) to `to` (exclusive). */
  getCategoryPage(slug, from, to) {
    return client.fetch<CategoryWithArticles | null>(CATEGORY_QUERY, {
      slug,
      from,
      to,
    });
  },

  getTrendingTopics() {
    return client.fetch<Topic[]>(TRENDING_TOPICS_QUERY);
  },

  getTopic(slug) {
    return client.fetch<TopicWithArticles | null>(TOPIC_QUERY, { slug });
  },

  getTopicSlugs() {
    return client.fetch<string[]>(TOPIC_SLUGS_QUERY);
  },

  getAuthor(slug) {
    return client.fetch<AuthorWithArticles | null>(AUTHOR_QUERY, { slug });
  },

  getAuthorSlugs() {
    return client.fetch<string[]>(AUTHOR_SLUGS_QUERY);
  },

  // Feeds and sitemaps

  getFeedItems() {
    return client.fetch<FeedItem[]>(FEED_QUERY);
  },

  getNewsSitemapItems(sinceIso) {
    return client.fetch<NewsSitemapItem[]>(NEWS_SITEMAP_QUERY, {
      since: sinceIso,
    });
  },

  getSitemapArticles() {
    return client.fetch<SitemapArticle[]>(SITEMAP_QUERY);
  },

  // Newsletter (moved here unchanged from the signup action)

  async addSubscriber(email, { referer }) {
    let writer;
    try {
      writer = writeClient();
    } catch {
      // Server Functions are reachable directly, not just through the form, so
      // a missing token must fail closed rather than silently no-op.
      return {
        ok: false,
        error: "Signups are not open yet — please try again later.",
      };
    }

    try {
      const existing = await writer.fetch<string | null>(
        `*[_type == "newsletterSubscriber" && email == $email][0]._id`,
        { email },
      );

      if (existing) {
        // Already on the list — this is success from the visitor's point of view.
        return { ok: true };
      }

      // A missing or malformed Referer must not stop a signup; it just
      // means no source is recorded.
      let source: string | null = null;
      try {
        source = referer ? new URL(referer).pathname : null;
      } catch {
        source = null;
      }

      await writer.create({
        _type: "newsletterSubscriber",
        email,
        subscribedAt: new Date().toISOString(),
        source,
      });

      return { ok: true };
    } catch {
      // A token without permission, an outage or a bad Referer used to crash
      // the action; now the visitor gets a plain message instead.
      return { ok: false, error: "Something went wrong — please try again." };
    }
  },
};
