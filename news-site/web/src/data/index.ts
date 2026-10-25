/**
 * The data seam: every page, route and component reads content through these
 * functions, never from a CMS client directly. `CONTENT_SOURCE` picks the
 * backend: unset or `sanity` keeps today's Sanity; `cms` reads the new Payload
 * CMS (plan task 1.9). Switching back is changing one variable.
 */
import { cmsSource } from "./cms";
import { sanitySource } from "./sanity";
import type { ContentSource, SubscribeContext } from "./types";

export type {
  Article,
  ArticleBodyData,
  ArticleListItem,
  Author,
  AuthorWithArticles,
  Category,
  CategoryWithArticles,
  CmsImage,
  ContentImage,
  Correction,
  FeedItem,
  ImageSource,
  LexicalNode,
  NewsSitemapItem,
  SitemapArticle,
  SubscribeContext,
  SubscribeOutcome,
  Topic,
  TopicRef,
  TopicWithArticles,
} from "./types";

const source: ContentSource =
  process.env.CONTENT_SOURCE === "cms" ? cmsSource : sanitySource;

// Articles

export const getLatestArticles = (limit: number) =>
  source.getLatestArticles(limit);
export const getArticle = (slug: string) => source.getArticle(slug);
export const getArticleSlugs = () => source.getArticleSlugs();
export const getRelatedArticles = (
  articleId: string,
  categorySlug: string | null,
) => source.getRelatedArticles(articleId, categorySlug);
export const searchArticles = (term: string) => source.searchArticles(term);

// Taxonomy and authors

export const getAllCategories = () => source.getAllCategories();
export const getCategorySlugs = () => source.getCategorySlugs();
/** One page of a category listing: articles `from` (inclusive) to `to` (exclusive). */
export const getCategoryPage = (slug: string, from: number, to: number) =>
  source.getCategoryPage(slug, from, to);
export const getTrendingTopics = () => source.getTrendingTopics();
export const getTopic = (slug: string) => source.getTopic(slug);
export const getTopicSlugs = () => source.getTopicSlugs();
export const getAuthor = (slug: string) => source.getAuthor(slug);
export const getAuthorSlugs = () => source.getAuthorSlugs();

// Feeds and sitemaps

export const getFeedItems = () => source.getFeedItems();
export const getNewsSitemapItems = (sinceIso: string) =>
  source.getNewsSitemapItems(sinceIso);
export const getSitemapArticles = () => source.getSitemapArticles();

// Newsletter

export const addSubscriber = (email: string, context: SubscribeContext) =>
  source.addSubscriber(email, context);
