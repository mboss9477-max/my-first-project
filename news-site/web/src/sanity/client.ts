import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  // The `production` dataset is public-read, so no token is required.
  useCdn: true,
});

/**
 * Draft-reading client, for previewing unpublished work.
 *
 * Requires SANITY_VIEWER_TOKEN — a Viewer token created at
 * sanity.io/manage/project/crji8h2y/api#tokens. It is server-only and must
 * never be exposed to the browser, so it is deliberately not NEXT_PUBLIC_.
 *
 * Not wired into the page components on purpose: reading `draftMode()` inside a
 * route opts that route out of static generation, which would undo the SSG on
 * every article and category page. Preview should be added as an explicit
 * opt-in surface rather than a cost paid on every production request.
 */
export function previewClient() {
  const token = process.env.SANITY_VIEWER_TOKEN;

  if (!token) {
    throw new Error(
      "SANITY_VIEWER_TOKEN is not set — draft preview cannot read unpublished documents.",
    );
  }

  return createClient({
    projectId,
    dataset,
    apiVersion,
    token,
    useCdn: false,
    perspective: "drafts",
  });
}
