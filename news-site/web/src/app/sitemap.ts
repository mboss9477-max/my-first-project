import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { client } from "@/sanity/client";
import { SITEMAP_QUERY } from "@/sanity/queries";

// Regenerate hourly; articles also trigger a rebuild via the page revalidate.
export const revalidate = 3600;

type SitemapArticle = { slug: string; publishedAt: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await client.fetch<SitemapArticle[]>(SITEMAP_QUERY);

  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
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
