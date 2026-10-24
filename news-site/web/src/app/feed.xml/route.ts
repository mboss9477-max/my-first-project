import { getFeedItems } from "@/data";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { escapeXml } from "@/lib/xml";

export const revalidate = 600;

export async function GET() {
  const articles = await getFeedItems();

  const items = articles
    .map((article) => {
      const url = `${SITE_URL}/article/${article.slug}`;

      return `    <item>
      <title>${escapeXml(article.headline)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      ${article.publishedAt ? `<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>` : ""}
      ${article.byline ? `<dc:creator>${escapeXml(article.byline)}</dc:creator>` : ""}
      ${article.category ? `<category>${escapeXml(article.category)}</category>` : ""}
      ${article.excerpt ? `<description>${escapeXml(article.excerpt)}</description>` : ""}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_TAGLINE)}</description>
    <language>en-GB</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
