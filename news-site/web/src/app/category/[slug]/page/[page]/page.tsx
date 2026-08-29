import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryListing, getCategory } from "@/components/CategoryListing";
import { SITE_NAME } from "@/lib/site";

export const revalidate = 60;

function parsePage(raw: string) {
  const page = Number(raw);
  // Page 1 lives at /category/[slug]; duplicating it here would split ranking
  // signals between two URLs for the same content.
  if (!Number.isInteger(page) || page < 2) return null;
  return page;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}): Promise<Metadata> {
  const { slug, page: rawPage } = await params;
  const page = parsePage(rawPage);
  if (!page) return { title: "Not found" };

  const category = await getCategory(slug, page);
  if (!category) return { title: "Category not found" };

  return {
    title: `${category.name} — page ${page}`,
    description: `The latest ${category.name} reporting from ${SITE_NAME}, page ${page}.`,
    alternates: { canonical: `/category/${category.slug}/page/${page}` },
    // Deeper pages add no ranking value but should still be crawled through.
    robots: { index: false, follow: true },
  };
}

export default async function CategoryPagedPage({
  params,
}: {
  params: Promise<{ slug: string; page: string }>;
}) {
  const { slug, page: rawPage } = await params;
  const page = parsePage(rawPage);

  if (!page) {
    notFound();
  }

  return <CategoryListing slug={slug} page={page} />;
}
