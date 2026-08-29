import { Search, TrendingUp } from "lucide-react";
import Link from "next/link";

import { CategoryNav } from "@/components/CategoryNav";
import { SITE_MONOGRAM, SITE_NAME } from "@/lib/site";
import { client } from "@/sanity/client";
import {
  ALL_CATEGORIES_QUERY,
  TRENDING_TOPICS_QUERY,
  type Category,
  type Topic,
} from "@/sanity/queries";

/** e.g. "Monday August 17 2026" — built explicitly to keep month-before-day. */
function mastheadDate() {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });
  const month = now.toLocaleDateString("en-US", { month: "long" });
  return `${weekday} ${month} ${now.getDate()} ${now.getFullYear()}`;
}

/** Small monogram mark used in the utility bar. */
function SiteMark() {
  return (
    <span
      aria-hidden="true"
      className="grid h-6 place-items-center border border-accent px-1.5 text-[0.6rem] font-semibold tracking-tight text-accent"
    >
      {SITE_MONOGRAM}
    </span>
  );
}

export async function SiteHeader() {
  const [categories, trending] = await Promise.all([
    client.fetch<Category[]>(ALL_CATEGORIES_QUERY),
    client.fetch<Topic[]>(TRENDING_TOPICS_QUERY),
  ]);

  return (
    <header>
      {/* TIER 1 — slim utility bar, always dark ash. */}
      <div className="bg-utility-bg text-utility-ink">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
          <Link href="/" aria-label={`${SITE_NAME} home`}>
            <SiteMark />
          </Link>

          <div className="ml-auto flex items-center gap-5">
            <Link
              href="/search"
              aria-label="Search stories"
              className="flex items-center gap-1.5 text-xs transition-colors duration-150 ease-out hover:text-accent"
            >
              <Search aria-hidden="true" className="size-3.5" />
              Search
            </Link>
            {/* No destination yet — kept as text, not dead links. */}
            <span
              aria-label="Language: English (switching not yet available)"
              className="label cursor-default"
            >
              EN
            </span>
            <span className="cursor-default text-xs opacity-80">
              UK Edition
            </span>
            <span className="cursor-default text-xs font-semibold">Log in</span>
          </div>
        </div>
      </div>

      {/*
        TIER 2 + 3 — the masthead block. Deliberately the one light section on
        the site, so it reads as a formal masthead moment.
      */}
      <div className="bg-masthead-bg text-masthead-ink">
        <div className="mx-auto max-w-6xl px-6 pt-3 pb-0 text-center">
          <p className="text-xs text-masthead-soft">{mastheadDate()}</p>

          <Link href="/" className="mt-1 inline-block">
            <span className="font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              {SITE_NAME}
            </span>
            <span className="sr-only">— home</span>
          </Link>
        </div>

        <CategoryNav categories={categories} />
      </div>

      {/* Trending strip — real topic links now, driven by the Studio flag. */}
      {trending.length > 0 ? (
        <div className="border-b border-rule">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 text-sm">
            <span className="flex items-center gap-2">
              <TrendingUp aria-hidden="true" className="size-4 text-accent" />
              <span className="font-semibold">Trending</span>
            </span>
            {trending.map((topic) => (
              <Link
                key={topic._id}
                href={`/topic/${topic.slug}`}
                className="text-ink-soft transition-colors duration-150 ease-out hover:text-accent"
              >
                {topic.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
