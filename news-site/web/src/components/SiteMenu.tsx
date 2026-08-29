"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE_MONOGRAM, SITE_NAME } from "@/lib/site";

/**
 * The CSN mark, top-left, now opens a small panel instead of linking straight
 * home — "Home" moved inside the panel as its first item, so that navigation
 * isn't lost, just relocated alongside the settings that live here now
 * (theme, previously stranded in the footer).
 *
 * A plain disclosure pattern (button + labelled region), not `role="menu"`:
 * ARIA's menu role is for actual application menus with arrow-key navigation
 * between items, which this isn't — it's a couple of unrelated controls
 * revealed together, closer to a settings popover.
 */
export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-menu-panel"
        aria-label={`${SITE_NAME} menu`}
        className="grid h-6 place-items-center border border-accent px-1.5 text-[0.6rem] font-semibold tracking-tight text-accent transition-colors duration-150 ease-out hover:bg-accent hover:text-utility-bg"
      >
        {SITE_MONOGRAM}
      </button>

      {open ? (
        <div
          id="site-menu-panel"
          className="fade-in absolute top-full left-0 z-50 mt-2 w-48 border border-rule bg-surface p-3 text-ink shadow-lg"
        >
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="block rounded-sm px-2 py-1.5 text-sm font-medium transition-colors duration-150 ease-out hover:text-accent"
          >
            Home
          </Link>

          <div className="mt-3 border-t border-rule pt-3">
            <p className="px-2 text-xs text-ink-soft">Appearance</p>
            <div className="mt-2 px-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
