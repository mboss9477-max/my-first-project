import Image from "next/image";
import Link from "next/link";

import { formatDate } from "@/lib/format";
import { PLACEHOLDER_ARTICLES } from "@/lib/placeholder-articles";
import { client } from "@/sanity/client";
import { urlForImage } from "@/sanity/image";
import { ARTICLES_QUERY, type ArticleListItem } from "@/sanity/queries";

// Re-fetch from Sanity at most once a minute.
export const revalidate = 60;

/** Real Sanity articles carry `heroImage`; placeholders carry a stock URL. */
type CardArticle = ArticleListItem & { placeholderImage?: string };

function CategoryLabel({ category }: { category: string | null }) {
  if (!category) return null;
  return <span className="label text-accent">{category}</span>;
}

function Meta({ article }: { article: CardArticle }) {
  const date = formatDate(article.publishedAt);
  if (!article.byline && !date) return null;

  return (
    <p className="mt-3 text-xs text-ink-soft">
      {article.byline}
      {article.byline && date ? " · " : null}
      {date ? (
        <time dateTime={article.publishedAt ?? undefined}>{date}</time>
      ) : null}
    </p>
  );
}

function CardImage({
  article,
  ratio,
  sizes,
}: {
  article: CardArticle;
  ratio: string;
  sizes: string;
}) {
  const hero = article.heroImage;

  if (hero) {
    return (
      <Image
        src={urlForImage(hero).width(1200).height(800).fit("crop").url()}
        alt={hero.alt ?? ""}
        width={1200}
        height={800}
        sizes={sizes}
        className={`${ratio} h-full w-full object-cover`}
      />
    );
  }

  if (article.placeholderImage) {
    return (
      // Decorative stock photo standing in for unpublished content, so alt="".
      <Image
        src={article.placeholderImage}
        alt=""
        width={1200}
        height={800}
        sizes={sizes}
        className={`${ratio} h-full w-full object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${ratio} grid h-full w-full place-items-center bg-surface`}
    >
      <span className="size-2 rotate-45 border border-accent opacity-50" />
    </div>
  );
}

/** Small gold square list marker. */
function Marker() {
  return (
    <span
      aria-hidden="true"
      className="mt-[0.42rem] size-1.5 shrink-0 bg-accent"
    />
  );
}

/** Lead cell: image left, headline and sub-links right. */
function LeadCell({
  lead,
  subLinks,
}: {
  lead: CardArticle;
  subLinks: CardArticle[];
}) {
  return (
    <article className="grid sm:grid-cols-[minmax(0,44%)_1fr]">
      <CardImage
        article={lead}
        ratio="aspect-[4/3] sm:aspect-auto sm:min-h-full"
        sizes="(max-width: 640px) 100vw, 420px"
      />

      <div className="p-6">
        <CategoryLabel category={lead.category} />

        <h3 className="mt-2 font-serif text-2xl leading-[1.15] tracking-tight md:text-[2rem]">
          <Link
            href={`/article/${lead.slug}`}
            className="transition-colors hover:text-accent"
          >
            {lead.headline}
          </Link>
        </h3>

        {lead.excerpt ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {lead.excerpt}
          </p>
        ) : null}

        <Meta article={lead} />

        {subLinks.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-2.5 border-t border-rule pt-4">
            {subLinks.map((sub) => (
              <li key={sub._id} className="flex gap-2.5">
                <Marker />
                <Link
                  href={`/article/${sub.slug}`}
                  className="text-sm leading-snug font-semibold text-accent hover:underline"
                >
                  {sub.headline}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

/** Narrow strip beneath the lead, with inert carousel controls. */
function StripCell({ article }: { article: CardArticle }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <h3 className="min-w-0 flex-1 font-serif text-base leading-snug tracking-tight">
        <Link
          href={`/article/${article.slug}`}
          className="transition-colors hover:text-accent"
        >
          {article.headline}
        </Link>
      </h3>

      <div className="flex shrink-0 gap-1.5">
        {[
          { label: "Previous story", d: "M15 6l-6 6 6 6" },
          { label: "Next story", d: "M9 6l6 6-6 6" },
        ].map((control) => (
          <button
            key={control.label}
            type="button"
            disabled
            aria-label={`${control.label} (not yet available)`}
            className="grid size-7 cursor-not-allowed place-items-center rounded-full border border-rule text-ink-soft"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={control.d} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Right-hand column of compact text-only headlines. */
function SidebarCell({ articles }: { articles: CardArticle[] }) {
  return (
    <section aria-labelledby="more-heading" className="p-6">
      <h2 id="more-heading" className="label text-ink-soft">
        More top stories
      </h2>

      <ul className="mt-4 flex flex-col divide-y divide-rule">
        {articles.map((article) => (
          <li key={article._id} className="flex gap-2.5 py-3 first:pt-0">
            <Marker />
            <div>
              <CategoryLabel category={article.category} />
              <h3 className="mt-1 font-serif text-base leading-snug tracking-tight">
                <Link
                  href={`/article/${article.slug}`}
                  className="transition-colors hover:text-accent"
                >
                  {article.headline}
                </Link>
              </h3>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Large image cell for the second row. */
function FeatureCell({ article }: { article: CardArticle }) {
  return (
    <article className="flex flex-col">
      <CardImage
        article={article}
        ratio="aspect-[16/9]"
        sizes="(max-width: 1024px) 100vw, 560px"
      />

      <div className="p-6">
        <CategoryLabel category={article.category} />

        <h3 className="mt-2 font-serif text-2xl leading-tight tracking-tight">
          <Link
            href={`/article/${article.slug}`}
            className="transition-colors hover:text-accent"
          >
            {article.headline}
          </Link>
        </h3>

        <Meta article={article} />
      </div>
    </article>
  );
}

/** Stacked list of smaller items with thumbnails. */
function BriefingCell({ articles }: { articles: CardArticle[] }) {
  return (
    <section aria-labelledby="briefing-heading" className="p-6">
      <h2 id="briefing-heading" className="label text-ink-soft">
        Briefing
      </h2>

      <ul className="mt-4 flex flex-col divide-y divide-rule">
        {articles.map((article) => {
          const date = formatDate(article.publishedAt);

          return (
            <li key={article._id} className="flex gap-4 py-4 first:pt-0">
              <div className="w-24 shrink-0">
                <CardImage article={article} ratio="aspect-[4/3]" sizes="96px" />
              </div>

              <div className="min-w-0">
                <CategoryLabel category={article.category} />
                <h3 className="mt-1 font-serif text-base leading-snug tracking-tight">
                  <Link
                    href={`/article/${article.slug}`}
                    className="transition-colors hover:text-accent"
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
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default async function HomePage() {
  const published = await client.fetch<ArticleListItem[]>(ARTICLES_QUERY);

  // Fall back to placeholder content only while the dataset is empty, so the
  // layout is reviewable before anything is published.
  const usingPlaceholders = published.length === 0;
  const articles: CardArticle[] = usingPlaceholders
    ? PLACEHOLDER_ARTICLES
    : published;

  const lead = articles[0];
  const leadSubs = articles.slice(1, 3);
  const strip = articles[3];
  const sidebar = articles.slice(4, 8);
  const feature = articles[8];
  const briefing = articles.slice(9, 12);

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      {usingPlaceholders ? (
        <p className="mb-6 border border-rule bg-surface px-4 py-3 text-xs text-ink-soft">
          <span className="label text-accent">Placeholder content</span> — no
          articles published yet. Publish one in the Sanity Studio and it will
          replace this automatically.
        </p>
      ) : null}

      {/*
        The cage: each cluster owns a real border and negative margins collapse
        shared edges into a single hairline. `items-start` lets a shorter column
        simply end, rather than leaving a filled block behind.
      */}
      {lead ? (
        <div className="grid lg:grid-cols-[1fr_20rem]">
          <div className="border border-rule">
            <LeadCell lead={lead} subLinks={leadSubs} />
            {strip ? (
              <div className="border-t border-rule">
                <StripCell article={strip} />
              </div>
            ) : null}
          </div>

          {sidebar.length > 0 ? (
            <aside className="-mt-px border border-rule lg:mt-0 lg:-ml-px">
              <SidebarCell articles={sidebar} />
            </aside>
          ) : null}
        </div>
      ) : null}

      {feature || briefing.length > 0 ? (
        <div className="-mt-px grid lg:grid-cols-[1.1fr_1fr]">
          {feature ? (
            <div className="border border-rule">
              <FeatureCell article={feature} />
            </div>
          ) : null}
          {briefing.length > 0 ? (
            <div className="-mt-px border border-rule lg:mt-0 lg:-ml-px">
              <BriefingCell articles={briefing} />
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
