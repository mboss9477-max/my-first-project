import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleRow } from "@/components/ArticleRow";
import { SITE_NAME } from "@/lib/site";
import { client } from "@/sanity/client";
import {
  CATEGORY_QUERY,
  CATEGORY_SLUGS_QUERY,
  type CategoryWithArticles,
} from "@/sanity/queries";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(CATEGORY_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

function getCategory(slug: string) {
  return client.fetch<CategoryWithArticles | null>(CATEGORY_QUERY, { slug });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) return { title: "Category not found" };

  const description = `The latest ${category.name} reporting from ${SITE_NAME}.`;
  const url = `/category/${category.slug}`;

  return {
    title: category.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: `${category.name} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_GB",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    notFound();
  }

  const { articles } = category;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-ink-soft transition-colors duration-150 ease-out hover:text-accent">
        ← Back to the front page
      </Link>

      <header className="mt-6 border-b border-rule pb-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight md:text-5xl">
          {category.name}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {articles.length === 0
            ? "No stories published in this section yet."
            : `${articles.length} ${articles.length === 1 ? "story" : "stories"}`}
        </p>
      </header>

      {articles.length > 0 ? (
        <ul className="fade-in mt-2 divide-y divide-rule">
          {articles.map((article) => (
            <ArticleRow key={article._id} article={article} />
          ))}
        </ul>
      ) : (
        <p className="fade-in mt-8 text-ink-soft">
          Once a story is filed under {category.name}, it will appear here.
        </p>
      )}
    </main>
  );
}
