import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { parseBody } from "next-sanity/webhook";

/**
 * Sanity webhook target: publishing a document refreshes the affected pages
 * immediately instead of waiting out the 60s revalidate window.
 *
 * Requires SANITY_REVALIDATE_SECRET to be set here AND as the webhook secret in
 * sanity.io/manage. Without it every request is rejected — an unauthenticated
 * revalidation endpoint is a free cache-busting DoS.
 *
 * Configure at: sanity.io/manage/project/crji8h2y/api/webhooks
 *   URL:     https://<your-domain>/api/revalidate
 *   Trigger: create, update, delete
 *   Filter:  _type in ["article", "category", "author", "topic"]
 *   Projection: {_type, "slug": slug.current, "categorySlug": category->slug.current}
 */
type WebhookPayload = {
  _type: string;
  slug?: string;
  categorySlug?: string;
};

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;

  if (!secret) {
    return new Response(
      "SANITY_REVALIDATE_SECRET is not configured on this deployment",
      { status: 500 },
    );
  }

  let body: WebhookPayload | null = null;
  let isValid = false;

  try {
    const parsed = await parseBody<WebhookPayload>(request, secret);
    body = parsed.body;
    isValid = parsed.isValidSignature === true;
  } catch (error) {
    return new Response(
      `Could not parse webhook body: ${(error as Error).message}`,
      { status: 400 },
    );
  }

  if (!isValid) {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  if (!body?._type) {
    return new Response("Payload is missing _type", { status: 400 });
  }

  // The front page reflects almost any content change, so it always refreshes.
  const paths = new Set<string>(["/"]);

  switch (body._type) {
    case "article": {
      if (body.slug) paths.add(`/article/${body.slug}`);
      if (body.categorySlug) paths.add(`/category/${body.categorySlug}`);
      break;
    }
    case "category": {
      if (body.slug) paths.add(`/category/${body.slug}`);
      break;
    }
    case "author": {
      if (body.slug) paths.add(`/author/${body.slug}`);
      break;
    }
    case "topic": {
      if (body.slug) paths.add(`/topic/${body.slug}`);
      break;
    }
  }

  // Feeds and sitemaps list everything, so they refresh on any change.
  paths.add("/feed.xml");
  paths.add("/sitemap.xml");
  paths.add("/news-sitemap.xml");

  for (const path of paths) {
    revalidatePath(path);
  }

  return Response.json({
    revalidated: true,
    paths: [...paths],
    at: new Date().toISOString(),
  });
}
