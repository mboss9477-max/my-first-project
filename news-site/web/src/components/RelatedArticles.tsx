import Link from "next/link";

import { Reveal } from "@/components/Reveal";
import { formatDate } from "@/lib/format";
import { client } from "@/sanity/client";
import { RELATED_ARTICLES_QUERY, type ArticleListItem } from "@/sanity/queries";

/**
 * More from the same section, at the foot of an article. Renders nothing when
 * the article has no category or no siblings, rather than an empty heading.
 */
export async function RelatedArticles({
  articleId,
  categorySlug,
}: {
  articleId: string;
  categorySlug: string | null;
}) {
  if (!categorySlug) return null;

  const related = await client.fetch<ArticleListItem[]>(
    RELATED_ARTICLES_QUERY,
    { id: articleId, categorySlug },
  );

  if (related.length === 0) return null;

  return (
    <Reveal>
      <section
        aria-labelledby="related-heading"
        className="mt-14 border-t border-rule pt-6"
      >
        <h2 id="related-heading" className="label text-ink-soft">
          More from this section
        </h2>

        <ul className="mt-4 divide-y divide-rule">
          {related.map((article) => {
            const date = formatDate(article.publishedAt);

            return (
              <li key={article._id} className="py-3 first:pt-0">
                <h3 className="font-serif text-lg leading-snug tracking-tight">
                  <Link
                    href={`/article/${article.slug}`}
                    className="transition-colors duration-150 ease-out hover:text-accent"
                  >
                    {article.headline}
                  </Link>
                </h3>
                {date ? (
                  <time
                    dateTime={article.publishedAt ?? undefined}
                    className="mt-1 block text-xs text-ink-soft"
                  >
                    {date}
                  </time>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </Reveal>
  );
}
