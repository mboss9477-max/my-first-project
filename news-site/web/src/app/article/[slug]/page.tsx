import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/ArticleBody";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { ReadingProgress } from "@/components/ReadingProgress";
import { RelatedArticles } from "@/components/RelatedArticles";
import { ShareLinks } from "@/components/ShareLinks";
import { formatDate } from "@/lib/format";
import { readingTime } from "@/lib/reading-time";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { client } from "@/sanity/client";
import { displayDimensions, urlForImage } from "@/sanity/image";
import {
  ARTICLE_QUERY,
  ARTICLE_SLUGS_QUERY,
  type Article,
} from "@/sanity/queries";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await client.fetch<string[]>(ARTICLE_SLUGS_QUERY);
  return slugs.map((slug) => ({ slug }));
}

function getArticle(slug: string) {
  // Called by generateMetadata, the OG image and the page; Next dedupes it.
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
      modifiedTime: article.updatedAt ?? undefined,
      authors: article.byline ? [article.byline] : undefined,
      section: article.category ?? undefined,
      tags: article.topics?.map((topic) => topic.name),
      // When there is no hero, opengraph-image.tsx generates a card instead.
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
    dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
    articleSection: article.category ?? undefined,
    keywords: article.topics?.map((topic) => topic.name).join(", ") || undefined,
    image: image ? [image] : undefined,
    author: article.byline
      ? [
          {
            "@type": "Person",
            name: article.byline,
            url: article.authorSlug
              ? `${SITE_URL}/author/${article.authorSlug}`
              : undefined,
          },
        ]
      : undefined,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
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

  const published = formatDate(article.publishedAt);
  const updated = formatDate(article.updatedAt);
  const minutes = readingTime(article.body);

  const hero = article.heroImage;
  // Sanity stores asset dimensions on upload; the fallback only guards against
  // an asset whose metadata has not been processed yet.
  const heroSize = hero
    ? (displayDimensions(hero, 1600) ?? { width: 1600, height: 900 })
    : null;

  const trail: Crumb[] = [];
  if (article.category && article.categorySlug) {
    trail.push({
      name: article.category,
      href: `/category/${article.categorySlug}`,
    });
  }
  trail.push({ name: article.headline, href: `/article/${article.slug}` });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <script
        type="application/ld+json"
        // JSON.stringify drops the undefined fields above.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(newsArticleJsonLd(article)),
        }}
      />

      <Breadcrumbs trail={trail} />

      <ReadingProgress>
      <article className="mt-8">
        {article.category && article.categorySlug ? (
          <Link
            href={`/category/${article.categorySlug}`}
            className="label text-accent transition-colors duration-150 ease-out hover:underline"
          >
            {article.category}
          </Link>
        ) : null}

        <h1 className="mt-2 font-serif text-4xl leading-[1.15] font-semibold tracking-tight md:text-5xl">
          {article.headline}
        </h1>

        {article.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            {article.excerpt}
          </p>
        ) : null}

        <div className="mt-4 text-sm text-ink-soft">
          <p>
            {article.byline ? (
              <span>
                By{" "}
                {article.authorSlug ? (
                  <Link
                    href={`/author/${article.authorSlug}`}
                    className="transition-colors duration-150 ease-out hover:text-accent"
                  >
                    {article.byline}
                  </Link>
                ) : (
                  article.byline
                )}
              </span>
            ) : null}
            {article.byline && published ? <span> · </span> : null}
            {published ? (
              <time dateTime={article.publishedAt ?? undefined}>
                {published}
              </time>
            ) : null}
            {minutes ? <span> · {minutes} min read</span> : null}
          </p>

          {updated ? (
            <p className="mt-1 text-xs">
              Updated{" "}
              <time dateTime={article.updatedAt ?? undefined}>{updated}</time>
            </p>
          ) : null}
        </div>

        {hero && heroSize ? (
          <figure className="fade-in mt-8">
            <Image
              src={urlForImage(hero).width(heroSize.width).url()}
              alt={hero.alt ?? ""}
              width={heroSize.width}
              height={heroSize.height}
              priority
              sizes="(max-width: 672px) 100vw, 672px"
              placeholder={hero.lqip ? "blur" : undefined}
              blurDataURL={hero.lqip ?? undefined}
              className="h-auto w-full rounded"
            />
            {/* A real caption field — distinct from alt text, which describes
                the image rather than captioning it. */}
            {hero.caption ? (
              <figcaption className="mt-2 text-sm text-ink-soft">
                {hero.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="fade-in mt-8 text-lg">
          {article.body?.length ? (
            <ArticleBody value={article.body} />
          ) : (
            <p className="text-ink-soft">This article has no body content yet.</p>
          )}
        </div>

        {article.topics?.length ? (
          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-rule pt-6">
            <span className="label text-ink-soft">Topics</span>
            {article.topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/topic/${topic.slug}`}
                className="rounded-sm border border-rule px-2.5 py-1 text-xs transition-colors duration-150 ease-out hover:border-accent hover:text-accent"
              >
                {topic.name}
              </Link>
            ))}
          </div>
        ) : null}

        {article.corrections?.length ? (
          <aside className="mt-8 border-l-4 border-accent bg-surface px-4 py-3">
            <h2 className="label text-accent">Corrections</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {article.corrections.map((correction) => (
                <li key={correction.correctedAt} className="text-sm text-ink-soft">
                  <time dateTime={correction.correctedAt}>
                    {formatDate(correction.correctedAt)}
                  </time>
                  {" — "}
                  {correction.note}
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <ShareLinks headline={article.headline} slug={article.slug} />
      </article>
      </ReadingProgress>

      <RelatedArticles
        articleId={article._id}
        categorySlug={article.categorySlug}
      />
    </main>
  );
}
