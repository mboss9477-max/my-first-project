"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Category } from "@/sanity/queries";

type Indicator = { left: number; width: number };

/**
 * Section nav with a gold underline that slides between items as you navigate.
 *
 * The underline is a single absolutely-positioned bar measured against the
 * active link, rather than a border on each item, so moving between sections
 * animates as one continuous movement rather than two separate fades.
 */
export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const [animate, setAnimate] = useState(false);

  const activeSlug = pathname?.startsWith("/category/")
    ? pathname.split("/")[2]
    : null;

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const active = list.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) {
      setIndicator(null);
      return;
    }

    setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
  }, []);

  useEffect(() => {
    measure();
  }, [measure, pathname, categories.length]);

  // Enable the transition only after the first measurement, so the bar does not
  // visibly slide in from x=0 on initial paint.
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  if (categories.length === 0) return null;

  return (
    <nav aria-label="Sections" className="mt-3">
      <ul
        ref={listRef}
        className="relative mx-auto flex max-w-6xl justify-center gap-6 overflow-x-auto px-6"
      >
        {categories.map((category) => {
          const isActive = category.slug === activeSlug;

          return (
            <li key={category._id} className="shrink-0">
              <Link
                href={`/category/${category.slug}`}
                data-active={isActive}
                aria-current={isActive ? "page" : undefined}
                className={`block pb-2.5 text-sm transition-colors duration-150 ease-out ${
                  isActive
                    ? "font-semibold text-masthead-ink"
                    : "text-masthead-soft hover:text-masthead-ink"
                }`}
              >
                {category.name}
              </Link>
            </li>
          );
        })}

        {indicator ? (
          <span
            aria-hidden="true"
            className={`absolute bottom-0 h-0.5 bg-accent ${
              animate ? "nav-underline--animate" : ""
            }`}
            style={{
              transform: `translateX(${indicator.left}px)`,
              width: `${indicator.width}px`,
            }}
          />
        ) : null}
      </ul>
    </nav>
  );
}
