import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ArticleRow } from "@/components/ArticleRow";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { client } from "@/sanity/client";
import { urlForImage } from "@/sanity/image";
import {
  AUTHOR_QUERY,
  AUTHOR_SLUGS_QUERY,
  type AuthorWithArticles,
} from "@/sanity/queries";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(AUTHOR_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

function getAuthor(slug: string) {
  return client.fetch<AuthorWithArticles | null>(AUTHOR_QUERY, { slug });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);

  if (!author) return { title: "Author not found" };

  const description =
    author.bio ?? `Stories by ${author.name} for ${SITE_NAME}.`;

  return {
    title: author.name,
    description,
    alternates: { canonical: `/author/${author.slug}` },
    openGraph: {
      type: "profile",
      title: `${author.name} | ${SITE_NAME}`,
      description,
      url: `/author/${author.slug}`,
      siteName: SITE_NAME,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await getAuthor(slug);

  if (!author) {
    notFound();
  }

  const portrait = author.image
    ? urlForImage(author.image).width(160).height(160).fit("crop").url()
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    jobTitle: author.role ?? undefined,
    description: author.bio ?? undefined,
    url: `${SITE_URL}/author/${author.slug}`,
    worksFor: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        trail={[{ name: author.name, href: `/author/${author.slug}` }]}
      />

      <header className="mt-6 flex items-start gap-5 border-b border-rule pb-6">
        {portrait ? (
          <Image
            src={portrait}
            alt=""
            width={80}
            height={80}
            className="size-20 shrink-0 rounded-full object-cover"
          />
        ) : null}

        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            {author.name}
          </h1>
          {author.role ? (
            <p className="label mt-1 text-accent">{author.role}</p>
          ) : null}
          {author.bio ? (
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
              {author.bio}
            </p>
          ) : null}
        </div>
      </header>

      {author.articles.length > 0 ? (
        <ul className="fade-in mt-2 divide-y divide-rule">
          {author.articles.map((article, index) => (
            <ArticleRow key={article._id} article={article} index={index} />
          ))}
        </ul>
      ) : (
        <p className="fade-in mt-8 text-ink-soft">
          No published stories by {author.name} yet.
        </p>
      )}
    </main>
  );
}
