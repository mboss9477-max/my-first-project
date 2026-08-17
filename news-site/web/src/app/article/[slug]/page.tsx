import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/ArticleBody";
import { formatDate } from "@/lib/format";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { client } from "@/sanity/client";
import { displayDimensions, urlForImage } from "@/sanity/image";
import {
  ARTICLE_QUERY,
  ARTICLE_SLUGS_QUERY,
  type Article,
} from "@/sanity/queries";

export const revalidate = 60;

/** Prerender every known article; unknown slugs still render on demand. */
export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(ARTICLE_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

function getArticle(slug: string) {
  // Called by both generateMetadata and the page; Next dedupes the request.
  return client.fetch<Article | null>(ARTICLE_QUERY, { slug });
}

/** 1200x630 crop of the hero, the conventional Open Graph card size. */
function socialImage(article: Article) {
  if (!article.heroImage) return null;
  return urlForImage(article.heroImage)
    .width(1200)
    .height(630)
    .fit("crop")
    .url();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "Article not found" };
  }

  const description = article.excerpt ?? undefined;
  const url = `/article/${article.slug}`;
  const image = socialImage(article);

  return {
    title: article.headline,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: article.headline,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_GB",
      publishedTime: article.publishedAt ?? undefined,
      authors: article.byline ? [article.byline] : undefined,
      section: article.category ?? undefined,
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: article.heroImage?.alt ?? article.headline,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.headline,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/** schema.org NewsArticle — what Google News and rich results read. */
function newsArticleJsonLd(article: Article) {
  const image = socialImage(article);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.headline,
    description: article.excerpt ?? undefined,
    datePublished: article.publishedAt ?? undefined,
    articleSection: article.category ?? undefined,
    image: image ? [image] : undefined,
    author: article.byline
      ? [{ "@type": "Person", name: article.byline }]
      : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/article/${article.slug}`,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const date = formatDate(article.publishedAt);

  const hero = article.heroImage;
  // Sanity stores asset dimensions on upload; the fallback only guards against
  // an asset whose metadata has not been processed yet.
  const heroSize = hero
    ? (displayDimensions(hero, 1600) ?? { width: 1600, height: 900 })
    : null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <script
        type="application/ld+json"
        // JSON.stringify drops the undefined fields above.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(newsArticleJsonLd(article)),
        }}
      />

      <Link href="/" className="text-sm text-ink-soft hover:text-accent">
        ← Back to all stories
      </Link>

      <article className="mt-8">
        {article.category ? (
          <span className="label text-accent">{article.category}</span>
        ) : null}

        <h1 className="mt-2 font-serif text-4xl leading-[1.15] font-semibold tracking-tight md:text-5xl">
          {article.headline}
        </h1>

        {article.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {article.excerpt}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-ink-soft">
          {article.byline ? <span>By {article.byline}</span> : null}
          {article.byline && date ? <span> · </span> : null}
          {date ? (
            <time dateTime={article.publishedAt ?? undefined}>{date}</time>
          ) : null}
        </p>

        {hero && heroSize ? (
          <figure className="mt-8">
            <Image
              src={urlForImage(hero).width(heroSize.width).url()}
              alt={hero.alt ?? ""}
              width={heroSize.width}
              height={heroSize.height}
              priority
              sizes="(max-width: 672px) 100vw, 672px"
              className="h-auto w-full rounded"
            />
            {/* A real caption field now — distinct from alt text, which
                describes the image rather than captioning it. */}
            {hero.caption ? (
              <figcaption className="mt-2 text-sm text-ink-soft">
                {hero.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="mt-8 text-lg">
          {article.body?.length ? (
            <ArticleBody value={article.body} />
          ) : (
            <p className="text-ink-soft">This article has no body content yet.</p>
          )}
        </div>
      </article>
    </main>
  );
}
