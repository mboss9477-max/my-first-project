"use client";

import { useEffect, useState } from "react";

type TextSize = "normal" | "large" | "larger";

const STORAGE_KEY = "csnews-text-size";
const SIZES: TextSize[] = ["normal", "large", "larger"];
const LABELS: Record<TextSize, string> = {
  normal: "Normal text size",
  large: "Large text size",
  larger: "Larger text size",
};

function apply(size: TextSize) {
  if (size === "normal") {
    document.documentElement.removeAttribute("data-text-size");
  } else {
    document.documentElement.setAttribute("data-text-size", size);
  }
}

/**
 * Cycles Normal -> Large -> Larger -> Normal. Scales the root font-size, so
 * Tailwind's rem-based type scale grows everything proportionally without
 * touching individual components — low risk of overflow since text reflows
 * in flexible containers rather than clipping against fixed pixel sizes.
 *
 * Deliberately not wrapped in a transition: animating font-size makes text
 * visibly reflow mid-transition, which reads as glitchy rather than smooth,
 * unlike the color/transform transitions used elsewhere on the site.
 *
 * Renders nothing until mounted — the server cannot know the stored choice,
 * and guessing would flash the wrong size.
 */
export function TextSizeControl() {
  const [size, setSize] = useState<TextSize>("normal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as TextSize | null;
    if (stored && SIZES.includes(stored)) {
      setSize(stored);
    }
    setMounted(true);
  }, []);

  function cycle() {
    const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length];
    setSize(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  if (!mounted) {
    return <div className="h-6 w-8" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${LABELS[size]} — click to change`}
      title={LABELS[size]}
      className="flex items-center gap-0.5 text-xs transition-colors duration-150 ease-out hover:text-accent"
    >
      <span className="text-[0.7rem]" aria-hidden="true">
        A
      </span>
      <span className="text-sm" aria-hidden="true">
        A
      </span>
    </button>
  );
}
