"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Restrained scroll reveal: a short rise and fade, once, as content enters view.
 *
 * `once: true` means nothing re-animates when scrolling back up — repeated
 * motion reads as fidgety on a text-heavy page. Under reduced motion the
 * element renders in its final state with no transition at all.
 *
 * Motion renders the element visible in the DOM regardless, so the content is
 * never gated behind the animation.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
