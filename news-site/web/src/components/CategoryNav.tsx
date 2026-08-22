"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Category } from "@/sanity/queries";

/**
 * Section nav with a gold underline that slides between sections.
 *
 * `layoutId` gives every active-item underline the same identity, so when the
 * route changes Motion animates the single bar from the old item's box to the
 * new one instead of cross-fading two separate borders.
 */
export function CategoryNav({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const activeSlug = pathname?.startsWith("/category/")
    ? pathname.split("/")[2]
    : null;

  if (categories.length === 0) return null;

  return (
    <nav aria-label="Sections" className="mt-3">
      <ul className="mx-auto flex max-w-6xl justify-center gap-6 overflow-x-auto px-6">
        {categories.map((category) => {
          const isActive = category.slug === activeSlug;

          return (
            <li key={category._id} className="relative shrink-0">
              <Link
                href={`/category/${category.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={`block pb-2.5 text-sm transition-colors duration-150 ease-out ${
                  isActive
                    ? "font-semibold text-masthead-ink"
                    : "text-masthead-soft hover:text-masthead-ink"
                }`}
              >
                {category.name}
              </Link>

              {isActive ? (
                <motion.span
                  layoutId="nav-underline"
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-accent"
                  // Reduced motion: snap straight to the new position.
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }
                  }
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
