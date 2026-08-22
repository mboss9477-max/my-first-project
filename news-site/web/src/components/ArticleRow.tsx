import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/Reveal";
import { formatDate } from "@/lib/format";
import { urlForImage } from "@/sanity/image";
import type { ArticleListItem } from "@/sanity/queries";

type RowArticle = ArticleListItem & { placeholderImage?: string };

/** One article in a vertical list: thumbnail, category, headline, date. */
export function ArticleRow({ article }: { article: RowArticle }) {
  const date = formatDate(article.publishedAt);

  const thumb = article.heroImage
    ? urlForImage(article.heroImage).width(320).height(240).fit("crop").url()
    : article.placeholderImage;

  return (
    // The reveal wraps the row's contents rather than replacing the <li>, so
    // the list keeps proper ul/li semantics.
    <li className="group">
      <Reveal className="flex gap-5 py-5">
      {thumb ? (
        <div className="w-28 shrink-0 overflow-hidden rounded-sm">
          <Image
            src={thumb}
            alt={article.heroImage?.alt ?? ""}
            width={320}
            height={240}
            sizes="112px"
            className="hover-zoom aspect-[4/3] h-full w-full object-cover"
          />
        </div>
      ) : null}

      <div className="min-w-0">
        {article.category ? (
          <span className="label text-accent">{article.category}</span>
        ) : null}

        <h2 className="mt-1 font-serif text-xl leading-snug tracking-tight">
          <Link
            href={`/article/${article.slug}`}
            className="transition-colors duration-150 ease-out hover:text-accent"
          >
            {article.headline}
          </Link>
        </h2>

        {article.excerpt ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {article.excerpt}
          </p>
        ) : null}

        <p className="mt-2 text-xs text-ink-soft">
          {article.byline}
          {article.byline && date ? " · " : null}
          {date ? (
            <time dateTime={article.publishedAt ?? undefined}>{date}</time>
          ) : null}
        </p>
        </div>
      </Reveal>
    </li>
  );
}
