import { draftMode } from "next/headers";
import type { NextRequest } from "next/server";

/**
 * Enable or disable draft mode.
 *
 *   /api/draft-mode?secret=…&slug=/article/some-slug   → enable, then redirect
 *   /api/draft-mode?disable=1                          → disable, back to home
 *
 * Guarded by SANITY_PREVIEW_SECRET so a stranger cannot flip the site into
 * showing unpublished work. The redirect target is validated as a same-site
 * path, since an unchecked redirect here would be an open redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const draft = await draftMode();

  if (searchParams.get("disable")) {
    draft.disable();
    return Response.redirect(new URL("/", request.url), 307);
  }

  const secret = process.env.SANITY_PREVIEW_SECRET;
  if (!secret) {
    return new Response("SANITY_PREVIEW_SECRET is not configured", {
      status: 500,
    });
  }

  if (searchParams.get("secret") !== secret) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  const slug = searchParams.get("slug") ?? "/";
  // Only same-site absolute paths: rejects "//evil.com" and "https://evil.com".
  const target = slug.startsWith("/") && !slug.startsWith("//") ? slug : "/";

  draft.enable();
  return Response.redirect(new URL(target, request.url), 307);
}
