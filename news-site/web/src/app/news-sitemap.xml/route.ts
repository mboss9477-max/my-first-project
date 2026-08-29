import { SITE_NAME, SITE_URL } from "@/lib/site";
import { escapeXml } from "@/lib/xml";
import { client } from "@/sanity/client";
import { NEWS_SITEMAP_QUERY } from "@/sanity/queries";

export const revalidate = 300;

type NewsItem = {
  headline: string;
  slug: string;
  publishedAt: string | null;
};

/**
 * Google News sitemap — a separate spec from the regular sitemap. Google only
 * considers articles from the last two days here, so the query is deliberately
 * narrow and refreshed more often than the main sitemap.
 */
export async function GET() {
  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const articles = await client.fetch<NewsItem[]>(NEWS_SITEMAP_QUERY, { since });

  const urls = articles
    .map(
      (article) => `  <url>
    <loc>${escapeXml(`${SITE_URL}/article/${article.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(SITE_NAME)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${article.publishedAt}</news:publication_date>
      <news:title>${escapeXml(article.headline)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
