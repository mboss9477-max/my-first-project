"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";

/**
 * Thin progress bar tracking scroll position through whatever it wraps.
 * Wraps the article body directly (rather than looking up an id) so the ref
 * Motion needs is created and owned in the same component — no server/client
 * boundary awkwardness passing refs across.
 *
 * `useSpring` smooths the otherwise jumpy raw scroll value — this is the one
 * spring in the system, and deliberately so: critically damped, no overshoot,
 * used only to smooth a continuous value, never for an enter/exit flourish.
 * Different problem to the bounce-on-click springs the site's ease-out rule
 * rejects.
 */
export function ReadingProgress({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 300,
    damping: 40,
    restDelta: 0.001,
  });

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-40 h-0.5 bg-transparent"
      >
        <motion.div
          className="h-full origin-left bg-accent"
          style={{ scaleX: progress }}
        />
      </div>
      <div ref={ref}>{children}</div>
    </>
  );
}
