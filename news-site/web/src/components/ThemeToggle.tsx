"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "csnews-theme";

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

/**
 * Three-state theme control. "System" removes the attribute entirely so the CSS
 * falls back to prefers-color-scheme, rather than freezing whatever the OS
 * happened to be when the reader first visited.
 *
 * Renders nothing until mounted, because the server cannot know the stored
 * choice and a guess would flash the wrong icon.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  if (!mounted) {
    return <div className="h-8 w-24" aria-hidden="true" />;
  }

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex items-center gap-1 rounded-sm border border-rule p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = theme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={isActive}
            title={label}
            className={`grid size-7 place-items-center rounded-sm transition-colors duration-150 ease-out ${
              isActive
                ? "bg-surface text-accent"
                : "text-ink-soft hover:text-accent"
            }`}
          >
            <Icon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
