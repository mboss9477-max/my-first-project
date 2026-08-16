import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleBody } from "@/components/ArticleBody";
import { client } from "@/sanity/client";
import { urlForImage } from "@/sanity/image";
import { ARTICLE_QUERY, type Article } from "@/sanity/queries";

export const revalidate = 60;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className="text-sm text-black/60 hover:underline dark:text-white/60"
      >
        ← Back to all stories
      </Link>

      <article className="mt-8">
        {article.category ? (
          <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
            {article.category}
          </p>
        ) : null}

        <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight">
          {article.headline}
        </h1>

        <p className="mt-4 text-sm text-black/60 dark:text-white/60">
          {article.byline ? <span>By {article.byline}</span> : null}
          {article.byline && date ? <span> · </span> : null}
          {date ? (
            <time dateTime={article.publishedAt ?? undefined}>{date}</time>
          ) : null}
        </p>

        {article.heroImage ? (
          <figure className="mt-8">
            <Image
              src={urlForImage(article.heroImage).width(1600).url()}
              alt={article.heroImage.alt ?? ""}
              width={800}
              height={533}
              priority
              className="h-auto w-full rounded"
            />
            {article.heroImage.alt ? (
              <figcaption className="mt-2 text-sm text-black/60 dark:text-white/60">
                {article.heroImage.alt}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="mt-8 text-lg">
          {article.body?.length ? (
            <ArticleBody value={article.body} />
          ) : (
            <p className="text-black/60 dark:text-white/60">
              This article has no body content yet.
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
