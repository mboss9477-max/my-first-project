import type { MetadataRoute } from "next";

import { getCategorySlugs, getSitemapArticles } from "@/data";
import { SITE_URL } from "@/lib/site";

// Regenerate hourly; articles also trigger a rebuild via the page revalidate.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, categorySlugs] = await Promise.all([
    getSitemapArticles(),
    getCategorySlugs(),
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
