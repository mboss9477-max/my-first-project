import Link from "next/link";
import { TrendingUp } from "lucide-react";

import {
  ACTIVE_CATEGORY,
  NAV_CATEGORIES,
  SITE_MONOGRAM,
  SITE_NAME,
} from "@/lib/site";

const TRENDING_TOPICS = ["Tidal cities", "Four-day week", "Open silicon"];

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

export function SiteHeader() {
  return (
    <header>
      {/* TIER 1 — slim utility bar, always dark ash. */}
      <div className="bg-utility-bg text-utility-ink">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
          <Link href="/" aria-label={`${SITE_NAME} home`}>
            <SiteMark />
          </Link>

          <div className="ml-auto flex items-center gap-5">
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

        {/* TIER 3 — nav, centred, active section underlined in gold. */}
        <nav aria-label="Sections" className="mt-3">
          <ul className="mx-auto flex max-w-6xl justify-center gap-6 overflow-x-auto px-6">
            {NAV_CATEGORIES.map((category) => {
              const isActive = category === ACTIVE_CATEGORY;

              return (
                <li key={category} className="shrink-0">
                  {/*
                    Not a link yet, so `aria-current="page"` would be misleading:
                    it describes the current item in a set of navigable links.
                    Visually-hidden text conveys the same thing honestly until
                    section routing exists.
                  */}
                  <span
                    className={`block cursor-default border-b-2 pb-2.5 text-sm transition-colors ${
                      isActive
                        ? "border-accent font-semibold"
                        : "border-transparent text-masthead-soft hover:text-masthead-ink"
                    }`}
                  >
                    {category}
                    {isActive ? (
                      <span className="sr-only"> (current section)</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Trending strip — back on the ash/dark page ground. Text only. */}
      <div className="border-b border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 text-sm">
          <span className="flex items-center gap-2">
            <TrendingUp aria-hidden="true" className="size-4 text-accent" />
            <span className="font-semibold">Trending</span>
          </span>
          {TRENDING_TOPICS.map((topic) => (
            <span
              key={topic}
              className="cursor-default text-ink-soft transition-colors hover:text-accent"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
