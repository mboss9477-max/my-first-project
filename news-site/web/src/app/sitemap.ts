import type { MetadataRoute } from "next";

import {
  getAuthorSlugs,
  getCategorySlugs,
  getSitemapArticles,
  getTopicSlugs,
} from "@/data";
import { SITE_URL } from "@/lib/site";

// Regenerate hourly; articles also trigger a rebuild via the page revalidate.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, categorySlugs, topicSlugs, authorSlugs] = await Promise.all([
    getSitemapArticles(),
    getCategorySlugs(),
    getTopicSlugs(),
    getAuthorSlugs(),
  ]);

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...categorySlugs.map((slug) => ({
      url: `${SITE_URL}/category/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...topicSlugs.map((slug) => ({
      url: `${SITE_URL}/topic/${slug}`,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
    ...authorSlugs.map((slug) => ({
      url: `${SITE_URL}/author/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.4,
    })),
    ...articles.map((article) => ({
      url: `${SITE_URL}/article/${article.slug}`,
      lastModified: article.publishedAt
        ? new Date(article.publishedAt)
        : undefined,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
