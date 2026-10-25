import { ImageResponse } from "next/og";

import { getArticle } from "@/data";
import { SITE_NAME } from "@/lib/site";

export const alt = "Article preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Generated social card, used when an article has no hero image — previously
 * those articles shared with no image at all. Rendered in the ash/gold palette
 * so it still reads as CS NEWS.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Next 16: params is async. Reading params.slug directly gave undefined, the
  // article lookup failed and every share image answered HTTP 500.
  const { slug } = await params;
  const article = await getArticle(slug);

  const headline = article?.headline ?? SITE_NAME;
  const category = article?.category ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#161614",
          color: "#edebe4",
          padding: 72,
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#d4af4f",
          }}
        >
          {category ?? SITE_NAME}
        </div>

        <div style={{ display: "flex", fontSize: 62, lineHeight: 1.15 }}>
          {headline.length > 110 ? `${headline.slice(0, 110)}…` : headline}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            color: "#a3a29a",
          }}
        >
          <div
            style={{
              display: "flex",
              border: "2px solid #d4af4f",
              color: "#d4af4f",
              padding: "6px 12px",
              fontSize: 22,
              letterSpacing: 2,
            }}
          >
            CSN
          </div>
          {SITE_NAME}
        </div>
      </div>
    ),
    size,
  );
}
