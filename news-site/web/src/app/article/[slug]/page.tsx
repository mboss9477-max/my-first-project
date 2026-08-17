import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/ArticleBody";
import { formatDate } from "@/lib/format";
import { client } from "@/sanity/client";
import { displayDimensions, urlForImage } from "@/sanity/image";
import { ARTICLE_QUERY, type Article } from "@/sanity/queries";

export const revalidate = 60;

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = await client.fetch<Article | null>(ARTICLE_QUERY, { slug });

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
