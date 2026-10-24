/**
 * Which pages to refresh when content changes. Shared by the Sanity webhook
 * and the CMS webhook, so both behave identically while the move from one to
 * the other happens.
 */
export type ContentChange = {
  /** "article", "category", "author" or "topic". */
  type: string;
  slug?: string | null;
  categorySlug?: string | null;
};

export function pathsToRevalidate(change: ContentChange): string[] {
  // The front page reflects almost any content change, so it always refreshes.
  const paths = new Set<string>(["/"]);

  switch (change.type) {
    case "article": {
      if (change.slug) paths.add(`/article/${change.slug}`);
      if (change.categorySlug) paths.add(`/category/${change.categorySlug}`);
      break;
    }
    case "category": {
      if (change.slug) paths.add(`/category/${change.slug}`);
      break;
    }
    case "author": {
      if (change.slug) paths.add(`/author/${change.slug}`);
      break;
    }
    case "topic": {
      if (change.slug) paths.add(`/topic/${change.slug}`);
      break;
    }
  }

  // Feeds and sitemaps list everything, so they refresh on any change.
  paths.add("/feed.xml");
  paths.add("/sitemap.xml");
  paths.add("/news-sitemap.xml");

  return [...paths];
}
