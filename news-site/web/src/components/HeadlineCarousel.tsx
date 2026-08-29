"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

type CarouselArticle = { _id: string; slug: string; headline: string };

const ICON_PATHS = {
  prev: "M15 6l-6 6 6 6",
  next: "M9 6l6 6-6 6",
};

/**
 * One-headline-at-a-time carousel for the strip beneath the lead story.
 * Slides in the direction of travel — right-to-left advancing "next", the
 * reverse for "prev" — rather than a plain crossfade, so the motion itself
 * communicates which way you moved.
 */
export function HeadlineCarousel({
  articles,
}: {
  articles: CarouselArticle[];
}) {
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);
  const reduceMotion = useReducedMotion();

  if (articles.length === 0) return null;

  const current = articles[index];

  function go(delta: number) {
    setState(([current]) => [
      (current + delta + articles.length) % articles.length,
      delta,
    ]);
  }

  const offset = reduceMotion ? 0 : 16;
  const duration = reduceMotion ? 0 : 0.2;
  // Gentle deceleration, no overshoot — matches the site-wide --motion-ease
  // token (see globals.css for the reasoning on why springs are not used here).
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="flex items-center gap-4 px-6 py-4">
      {/* Clips the slide so headlines never overflow into the buttons. */}
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.h3
            key={current._id}
            custom={direction}
            initial={{ x: direction * offset, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -direction * offset, opacity: 0 }}
            transition={{ duration, ease }}
            className="font-serif text-base leading-snug tracking-tight"
            // Announces the change to screen readers without narrating the
            // unchanged initial render.
            aria-live="polite"
          >
            <Link
              href={`/article/${current.slug}`}
              className="transition-colors duration-150 ease-out hover:text-accent"
            >
              {current.headline}
            </Link>
          </motion.h3>
        </AnimatePresence>
      </div>

      <div className="flex shrink-0 gap-1.5">
        {(
          [
            ["prev", "Previous story", -1],
            ["next", "Next story", 1],
          ] as const
        ).map(([key, label, delta]) => (
          <button
            key={key}
            type="button"
            onClick={() => go(delta)}
            aria-label={label}
            disabled={articles.length < 2}
            className="grid size-7 place-items-center rounded-full border border-rule text-ink-soft transition-colors duration-150 ease-out hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
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
              <path d={ICON_PATHS[key]} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
