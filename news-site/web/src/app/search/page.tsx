import type { Metadata } from "next";

import { ArticleRow } from "@/components/ArticleRow";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SearchForm } from "@/components/SearchForm";
import { SITE_NAME } from "@/lib/site";
import { client } from "@/sanity/client";
import { SEARCH_QUERY, type ArticleListItem } from "@/sanity/queries";

export const metadata: Metadata = {
  title: "Search",
  description: `Search reporting from ${SITE_NAME}.`,
  // Search result pages carry no value for a crawler and can generate
  // effectively infinite URLs, so keep them out of the index.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  // GROQ's `match` is prefix-based per word; the wildcard makes partial words
  // match too, which is what a reader expects from a search box.
  const results = term
    ? await client.fetch<ArticleListItem[]>(SEARCH_QUERY, { q: `${term}*` })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Breadcrumbs trail={[{ name: "Search", href: "/search" }]} />

      <header className="mt-6 border-b border-rule pb-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Search
        </h1>
        <SearchForm defaultValue={term} />
      </header>

      {term === "" ? (
        <p className="mt-8 text-ink-soft">
          Enter a word or phrase to search headlines, summaries and article
          text.
        </p>
      ) : results.length === 0 ? (
        <p className="fade-in mt-8 text-ink-soft">
          No stories match “{term}”.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-soft">
            {results.length} {results.length === 1 ? "result" : "results"} for “
            {term}”
          </p>
          <ul className="fade-in mt-2 divide-y divide-rule">
            {results.map((article, index) => (
              <ArticleRow key={article._id} article={article} index={index} />
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
