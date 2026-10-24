import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

import { pathsToRevalidate } from "@/lib/revalidate-paths";

/**
 * CMS webhook target: when something is published, unpublished or edited in
 * the new CMS it calls this, so the affected pages refresh immediately instead
 * of waiting out the 60 s window. The Sanity equivalent is /api/revalidate.
 *
 * Authenticated with a shared secret in the `x-revalidate-secret` header
 * (REVALIDATE_SECRET here and WEB_REVALIDATE_SECRET in the CMS). Without a
 * configured secret every request is refused: an open revalidation endpoint is
 * a free cache-busting DoS.
 *
 * Body: { "type": "article" | "category" | "author" | "topic",
 *         "slug": "...", "categorySlug": "..." }
 */
const MAX_BODY_BYTES = 2_000;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function secretMatches(provided: string | null, expected: string) {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Constant-time comparison; lengths must match first or timingSafeEqual throws.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return new Response("REVALIDATE_SECRET is not configured on this deployment", {
      status: 500,
    });
  }

  if (!secretMatches(request.headers.get("x-revalidate-secret"), secret)) {
    return new Response("Invalid secret", { status: 401 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new Response("Body too large", { status: 413 });
  }

  let body: { type?: unknown; slug?: unknown; categorySlug?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Body must be JSON", { status: 400 });
  }

  if (typeof body.type !== "string" || !body.type) {
    return new Response("Body is missing type", { status: 400 });
  }

  // Only well-formed slugs become paths; anything else is ignored rather than
  // turned into a strange path.
  const slug = (value: unknown) =>
    typeof value === "string" && SLUG.test(value) ? value : null;
  const paths = pathsToRevalidate({
    type: body.type,
    slug: slug(body.slug),
    categorySlug: slug(body.categorySlug),
  });

  for (const path of paths) {
    revalidatePath(path);
  }

  return Response.json({ revalidated: true, paths, at: new Date().toISOString() });
}
