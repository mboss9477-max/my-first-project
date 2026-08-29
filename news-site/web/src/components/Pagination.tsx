import Link from "next/link";

import { pageCount } from "@/lib/pagination";

/**
 * Plain prev/next links rather than infinite scroll: a crawler can follow them,
 * a reader can bookmark page 3, and nothing depends on JavaScript.
 */
export function Pagination({
  page,
  total,
  basePath,
}: {
  page: number;
  total: number;
  basePath: string;
}) {
  const pages = pageCount(total);
  if (pages <= 1) return null;

  /**
   * Path-based rather than `?page=`: reading searchParams in a route opts it
   * out of static generation, and page 1 is the one that actually gets linked
   * and crawled, so it stays prerendered.
   */
  const href = (n: number) => (n === 1 ? basePath : `${basePath}/page/${n}`);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-between border-t border-rule pt-6 text-sm"
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="text-ink-soft transition-colors duration-150 ease-out hover:text-accent"
        >
          ← Newer stories
        </Link>
      ) : (
        <span />
      )}

      <span className="text-xs text-ink-soft">
        Page {page} of {pages}
      </span>

      {page < pages ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="text-ink-soft transition-colors duration-150 ease-out hover:text-accent"
        >
          Older stories →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
