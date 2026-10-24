import { notFound } from "next/navigation";

import { ArticleRow } from "@/components/ArticleRow";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination } from "@/components/Pagination";
import { getCategoryPage } from "@/data";
import { PAGE_SIZE } from "@/lib/pagination";

export function getCategory(slug: string, page: number) {
  const from = (page - 1) * PAGE_SIZE;
  return getCategoryPage(slug, from, from + PAGE_SIZE);
}

/** Shared body for /category/[slug] and /category/[slug]/page/[page]. */
export async function CategoryListing({
  slug,
  page,
}: {
  slug: string;
  page: number;
}) {
  const category = await getCategory(slug, page);

  if (!category) {
    notFound();
  }

  const { articles, total } = category;

  // Page 3 of a two-page section is a dead end, not a valid URL.
  if (page > 1 && articles.length === 0) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Breadcrumbs
        trail={[{ name: category.name, href: `/category/${category.slug}` }]}
      />

      <header className="mt-6 border-b border-rule pb-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
          {category.name}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {total === 0
            ? "No stories published in this section yet."
            : `${total} ${total === 1 ? "story" : "stories"}`}
          {page > 1 ? ` · page ${page}` : ""}
        </p>
      </header>

      {articles.length > 0 ? (
        <>
          <ul className="fade-in mt-2 divide-y divide-rule">
            {articles.map((article, index) => (
              <ArticleRow key={article._id} article={article} index={index} />
            ))}
          </ul>

          <Pagination
            page={page}
            total={total}
            basePath={`/category/${category.slug}`}
          />
        </>
      ) : (
        <p className="fade-in mt-8 text-ink-soft">
          Once a story is filed under {category.name}, it will appear here.
        </p>
      )}
    </main>
  );
}
