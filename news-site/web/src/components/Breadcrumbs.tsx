import Link from "next/link";

import { SITE_URL } from "@/lib/site";

export type Crumb = { name: string; href: string };

/**
 * Visible breadcrumb trail plus matching BreadcrumbList structured data, so the
 * same hierarchy the reader sees is the one search engines index.
 */
export function Breadcrumbs({ trail }: { trail: Crumb[] }) {
  const full: Crumb[] = [{ name: "Home", href: "/" }, ...trail];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: full.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.href === "/" ? "" : crumb.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft">
          {full.map((crumb, index) => {
            const isLast = index === full.length - 1;

            return (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {isLast ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <>
                    <Link
                      href={crumb.href}
                      className="transition-colors duration-150 ease-out hover:text-accent"
                    >
                      {crumb.name}
                    </Link>
                    <span aria-hidden="true">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
