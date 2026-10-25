/**
 * Payload CMS implementation of the data seam (plan task 1.9). Reads the CMS's
 * public REST API, which by access rule returns published content only.
 * Selected with CONTENT_SOURCE=cms; see `data/index.ts`.
 *
 * Every request carries `next.revalidate = 60`, the same 60 s window the pages
 * use, so a route stays static (S7) and the publish webhook refreshes it sooner.
 */
import { createRateLimiter } from "@/lib/rate-limit";
import type { Category, Topic } from "@/sanity/queries";

import type {
  Article,
  ArticleListItem,
  AuthorWithArticles,
  CategoryWithArticles,
  CmsImage,
  ContentSource,
  LexicalNode,
  SubscribeOutcome,
  TopicWithArticles,
} from "./types";

const REVALIDATE_SECONDS = 60;
// The feed and sitemaps refresh less often than pages (same windows as before
// the switch), and a fetch's window also sets its route's window.
const FEED_REVALIDATE_SECONDS = 600;
const NEWS_SITEMAP_REVALIDATE_SECONDS = 300;
const SITEMAP_REVALIDATE_SECONDS = 3600;

function baseUrl() {
  return (process.env.CMS_URL ?? "http://localhost:3200").replace(/\/+$/, "");
}

// ---- Request helpers ------------------------------------------------------

/** Flatten nested params into Payload's bracket syntax: where[a][equals]=1. */
function flatten(value: unknown, prefix: string, out: [string, string][]) {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out));
  } else if (typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      flatten(inner, prefix ? `${prefix}[${key}]` : key, out);
    }
  } else {
    out.push([prefix, String(value)]);
  }
}

function queryString(params: Record<string, unknown>) {
  const pairs: [string, string][] = [];
  flatten(params, "", pairs);
  return new URLSearchParams(pairs).toString();
}

type ListResponse<T> = { docs: T[]; totalDocs: number };

async function find<T>(
  collection: string,
  params: Record<string, unknown>,
  revalidate = REVALIDATE_SECONDS,
): Promise<ListResponse<T>> {
  const url = `${baseUrl()}/api/${collection}?${queryString(params)}`;
  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) {
    throw new Error(`CMS request failed (${response.status}) for ${collection}`);
  }
  return (await response.json()) as ListResponse<T>;
}

// ---- CMS record shapes (only the fields this layer reads) ----------------

type MediaSize = { url?: string | null; width?: number | null };
type Media = {
  alt?: string | null;
  caption?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
  sizes?: Record<string, MediaSize | undefined> | null;
};
type NamedDoc = { id: number | string; name: string; slug: string };
type AuthorDoc = NamedDoc & { role?: string | null; bio?: string | null };
type ArticleDoc = {
  id: number | string;
  headline: string;
  slug: string;
  excerpt?: string | null;
  byline?: string | null;
  author?: AuthorDoc | number | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  /** Set by editors when a story is materially revised; shown to readers. */
  revisedAt?: string | null;
  category?: NamedDoc | number | null;
  topics?: (NamedDoc | number)[] | null;
  featured?: boolean | null;
  heroImage?: Media | number | null;
  body?: { root?: LexicalNode } | null;
  corrections?: { correctedAt: string; note: string }[] | null;
};

const isDoc = <T extends object>(value: T | number | string | null | undefined): value is T =>
  typeof value === "object" && value !== null;

// ---- Mapping --------------------------------------------------------------

function absolute(url: string) {
  return /^https?:\/\//.test(url) ? url : `${baseUrl()}${url}`;
}

/** A CMS media record as a site image, or null when it has no usable file. */
function toImage(media: Media | number | null | undefined): CmsImage | null {
  if (!isDoc(media) || !media.url) return null;

  const sizes: { width: number; url: string }[] = [];
  for (const size of Object.values(media.sizes ?? {})) {
    if (size?.url && size.width) sizes.push({ width: size.width, url: absolute(size.url) });
  }
  if (media.width) sizes.push({ width: media.width, url: absolute(media.url) });
  sizes.sort((a, b) => a.width - b.width);
  if (sizes.length === 0) sizes.push({ width: 1600, url: absolute(media.url) });

  return {
    alt: media.alt ?? null,
    caption: media.caption ?? null,
    crop: null,
    dimensions:
      media.width && media.height ? { width: media.width, height: media.height } : null,
    lqip: null,
    cms: { sizes },
  };
}

/** Copy the body, giving every upload node the image it points at. */
function withImages(node: LexicalNode & { value?: unknown }): LexicalNode {
  const { value, ...rest } = node;
  const mapped: LexicalNode = { ...rest };
  if (node.type === "upload") {
    mapped.image = toImage(value as Media | number | null);
  }
  if (node.children) mapped.children = node.children.map(withImages);
  return mapped;
}

function toListItem(doc: ArticleDoc): ArticleListItem {
  const author = isDoc(doc.author) ? doc.author : null;
  const category = isDoc(doc.category) ? doc.category : null;
  const topics = (doc.topics ?? []).filter(isDoc).map((t) => ({
    name: t.name,
    slug: t.slug,
  }));

  return {
    _id: String(doc.id),
    headline: doc.headline,
    slug: doc.slug,
    excerpt: doc.excerpt ?? null,
    byline: author?.name ?? doc.byline ?? null,
    authorSlug: author?.slug ?? null,
    publishedAt: doc.publishedAt ?? null,
    // The site's "Updated" date is the editors' revision date, not the last save.
    updatedAt: doc.revisedAt ?? null,
    category: category?.name ?? null,
    categorySlug: category?.slug ?? null,
    topics: topics.length ? topics : null,
    featured: doc.featured ?? null,
    heroImage: toImage(doc.heroImage),
  };
}

function toCategory(doc: NamedDoc): Category {
  return { _id: String(doc.id), name: doc.name, slug: doc.slug };
}

function toTopic(doc: NamedDoc): Topic {
  return { _id: String(doc.id), name: doc.name, slug: doc.slug };
}

// ---- Queries --------------------------------------------------------------

const LIST_FIELDS = {
  headline: true,
  slug: true,
  excerpt: true,
  byline: true,
  author: true,
  publishedAt: true,
  revisedAt: true,
  category: true,
  topics: true,
  featured: true,
  heroImage: true,
};

async function articleList(
  where: Record<string, unknown>,
  options: { limit: number; sort: string; revalidate?: number },
) {
  const { docs, totalDocs } = await find<ArticleDoc>(
    "articles",
    {
      where,
      sort: options.sort,
      limit: options.limit,
      depth: 1,
      select: LIST_FIELDS,
    },
    options.revalidate,
  );
  return { articles: docs.map(toListItem), total: totalDocs };
}

async function slugsOf(collection: string) {
  const { docs } = await find<{ slug: string }>(collection, {
    limit: 0,
    depth: 0,
    select: { slug: true },
  });
  return docs.map((doc) => doc.slug);
}

async function findBySlug<T>(collection: string, slug: string) {
  const { docs } = await find<T>(collection, {
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  });
  return docs[0] ?? null;
}

// ---- Newsletter signup ----------------------------------------------------

/**
 * Per visitor: at most 5 signup attempts in 10 minutes. Visitors whose address
 * the website cannot see share one bucket with a larger allowance, so a proxy
 * that hides addresses does not lock everyone out.
 */
const SIGNUP_WINDOW_MS = 10 * 60 * 1000;
const SIGNUP_MAX_PER_VISITOR = 5;
const SIGNUP_MAX_UNKNOWN_VISITORS = 30;
const signupLimiter = createRateLimiter({ windowMs: SIGNUP_WINDOW_MS });

/** For tests. */
export function resetSignupLimit() {
  signupLimiter.reset();
}

async function addSubscriberToCms(
  email: string,
  client: string,
): Promise<SubscribeOutcome> {
  const secret = process.env.CMS_SUBSCRIBE_SECRET;
  if (!secret) {
    // Server Functions are reachable directly, so a missing secret fails
    // closed instead of silently doing nothing.
    return { ok: false, error: "Signups are not open yet — please try again later." };
  }

  const max = client === "unknown" ? SIGNUP_MAX_UNKNOWN_VISITORS : SIGNUP_MAX_PER_VISITOR;
  if (!signupLimiter.allow(client, max)) {
    return { ok: false, error: "Too many attempts — please try again in a few minutes." };
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/api/newsletter-subscribers/subscribe`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-subscribe-secret": secret },
      body: JSON.stringify({ email }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return { ok: false, error: "Something went wrong — please try again." };
  }

  if (response.ok) return { ok: true };
  if (response.status === 400) return { ok: false, error: "Enter a valid email address." };
  if (response.status === 429) {
    return { ok: false, error: "Too many attempts — please try again in a few minutes." };
  }
  // 401/503 mean the two sides are misconfigured; the visitor cannot fix that.
  return { ok: false, error: "Signups are not open yet — please try again later." };
}

export const cmsSource: ContentSource = {
  async getLatestArticles(limit) {
    const { articles } = await articleList(
      {},
      { limit, sort: "-featured,-publishedAt" },
    );
    return articles;
  },

  async getArticle(slug) {
    const { docs } = await find<ArticleDoc>("articles", {
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
    });
    const doc = docs[0];
    if (!doc) return null;

    const author = isDoc(doc.author) ? doc.author : null;
    const root = doc.body?.root;
    const article: Article = {
      ...toListItem(doc),
      body: root ? { format: "lexical", root: withImages(root) } : null,
      corrections: doc.corrections?.length
        ? doc.corrections.map(({ correctedAt, note }) => ({ correctedAt, note }))
        : null,
      authorRole: author?.role ?? null,
      authorBio: author?.bio ?? null,
    };
    return article;
  },

  getArticleSlugs() {
    return slugsOf("articles");
  },

  async getRelatedArticles(articleId, categorySlug) {
    if (!categorySlug) return [];
    const { articles } = await articleList(
      {
        and: [
          { id: { not_equals: articleId } },
          { "category.slug": { equals: categorySlug } },
        ],
      },
      { limit: 3, sort: "-publishedAt" },
    );
    return articles;
  },

  /**
   * Headline and excerpt only: the CMS has no body search yet (Postgres
   * full-text search is plan task 2.5), so this is narrower than Sanity's.
   */
  async searchArticles(term) {
    if (!term) return [];
    const { articles } = await articleList(
      {
        or: [
          { headline: { like: term } },
          { excerpt: { like: term } },
        ],
      },
      { limit: 40, sort: "-publishedAt" },
    );
    return articles;
  },

  async getAllCategories() {
    const { docs } = await find<NamedDoc>("categories", {
      sort: "name",
      limit: 0,
      depth: 0,
    });
    return docs.map(toCategory);
  },

  getCategorySlugs() {
    return slugsOf("categories");
  },

  async getCategoryPage(slug, from, to) {
    const category = await findBySlug<NamedDoc>("categories", slug);
    if (!category) return null;
    const { articles, total } = await articleList(
      { category: { equals: category.id } },
      { limit: to, sort: "-publishedAt" },
    );
    const page: CategoryWithArticles = {
      ...toCategory(category),
      total,
      articles: articles.slice(from, to),
    };
    return page;
  },

  async getTrendingTopics() {
    const { docs } = await find<NamedDoc>("topics", {
      where: { trending: { equals: true } },
      sort: "name",
      limit: 4,
      depth: 0,
    });
    return docs.map(toTopic);
  },

  async getTopic(slug) {
    const topic = await findBySlug<NamedDoc>("topics", slug);
    if (!topic) return null;
    const { articles } = await articleList(
      { topics: { equals: topic.id } },
      { limit: 50, sort: "-publishedAt" },
    );
    const page: TopicWithArticles = { ...toTopic(topic), articles };
    return page;
  },

  getTopicSlugs() {
    return slugsOf("topics");
  },

  async getAuthor(slug) {
    const author = await findBySlug<AuthorDoc>("authors", slug);
    if (!author) return null;
    const { articles } = await articleList(
      { author: { equals: author.id } },
      { limit: 50, sort: "-publishedAt" },
    );
    const page: AuthorWithArticles = {
      _id: String(author.id),
      name: author.name,
      slug: author.slug,
      role: author.role ?? null,
      bio: author.bio ?? null,
      // The CMS authors collection has no portrait field yet.
      image: null,
      articles,
    };
    return page;
  },

  getAuthorSlugs() {
    return slugsOf("authors");
  },

  async getFeedItems() {
    const { articles } = await articleList(
      {},
      { limit: 50, sort: "-publishedAt", revalidate: FEED_REVALIDATE_SECONDS },
    );
    return articles.map((a) => ({
      headline: a.headline,
      slug: a.slug,
      excerpt: a.excerpt,
      byline: a.byline,
      publishedAt: a.publishedAt,
      category: a.category,
    }));
  },

  async getNewsSitemapItems(sinceIso) {
    const { articles } = await articleList(
      { publishedAt: { greater_than: sinceIso } },
      {
        limit: 1000,
        sort: "-publishedAt",
        revalidate: NEWS_SITEMAP_REVALIDATE_SECONDS,
      },
    );
    return articles.map((a) => ({
      headline: a.headline,
      slug: a.slug,
      publishedAt: a.publishedAt,
    }));
  },

  async getSitemapArticles() {
    const { docs } = await find<ArticleDoc>(
      "articles",
      {
        sort: "-publishedAt",
        limit: 0,
        depth: 0,
        select: { slug: true, publishedAt: true, updatedAt: true },
      },
      SITEMAP_REVALIDATE_SECONDS,
    );
    return docs.map((doc) => ({
      slug: doc.slug,
      publishedAt: doc.publishedAt ?? null,
      updatedAt: doc.updatedAt ?? null,
    }));
  },

  addSubscriber(email, { client }) {
    return addSubscriberToCms(email, client);
  },
};
