import type { Metadata } from "next";

import { CategoryListing, getCategory } from "@/components/CategoryListing";
import { SITE_NAME } from "@/lib/site";
import { client } from "@/sanity/client";
import { CATEGORY_SLUGS_QUERY } from "@/sanity/queries";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(CATEGORY_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug, 1);

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
  return <CategoryListing slug={slug} page={1} />;
}
