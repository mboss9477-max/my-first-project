import Image from "next/image";
import Link from "next/link";

import { client } from "@/sanity/client";
import { urlForImage } from "@/sanity/image";
import { ARTICLES_QUERY, type ArticleListItem } from "@/sanity/queries";

// Re-fetch from Sanity at most once a minute.
export const revalidate = 60;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function HomePage() {
  const articles = await client.fetch<ArticleListItem[]>(ARTICLES_QUERY);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10 border-b border-black/10 pb-6 dark:border-white/15">
        <h1 className="text-4xl font-bold tracking-tight">The Daily</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Latest stories
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          No articles yet. Open the Studio at{" "}
          <a
            className="underline"
            href="http://localhost:3333"
            target="_blank"
            rel="noreferrer"
          >
            localhost:3333
          </a>{" "}
          and publish your first one.
        </p>
      ) : (
        <ul className="flex flex-col gap-8">
          {articles.map((article) => {
            const date = formatDate(article.publishedAt);

            return (
              <li
                key={article._id}
                className="flex gap-5 border-b border-black/10 pb-8 last:border-0 dark:border-white/15"
              >
                {article.heroImage ? (
                  <Image
                    src={urlForImage(article.heroImage)
                      .width(320)
                      .height(214)
                      .fit("crop")
                      .url()}
                    alt={article.heroImage.alt ?? ""}
                    width={160}
                    height={107}
                    className="h-[107px] w-40 shrink-0 rounded object-cover"
                  />
                ) : null}

                <div className="min-w-0">
                  {article.category ? (
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                      {article.category}
                    </p>
                  ) : null}

                  <h2 className="mt-1 text-xl font-semibold leading-snug">
                    <Link
                      href={`/article/${article.slug}`}
                      className="hover:underline"
                    >
                      {article.headline}
                    </Link>
                  </h2>

                  <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                    {article.byline ? <span>{article.byline}</span> : null}
                    {article.byline && date ? <span> · </span> : null}
                    {date ? <time dateTime={article.publishedAt ?? undefined}>{date}</time> : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
