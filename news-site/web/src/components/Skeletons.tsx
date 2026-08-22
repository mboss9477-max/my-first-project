/**
 * Skeleton primitives for route-level loading.tsx files.
 *
 * Shapes mirror the real layout so the swap to content does not shift things
 * around. Tinted with --surface from the ash palette, never a grey that fights
 * the theme. Marked aria-hidden and paired with a polite status message, so a
 * screen reader hears "Loading…" once instead of a wall of empty boxes.
 */
function Block({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function LoadingAnnouncement({ label }: { label: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {label}
    </p>
  );
}

/** Matches ArticleRow: thumbnail left, text right. */
export function ArticleRowSkeleton() {
  return (
    <li className="flex gap-5 py-5">
      <Block className="aspect-[4/3] w-28 shrink-0" />
      <div className="min-w-0 flex-1">
        <Block className="h-2.5 w-16" />
        <Block className="mt-2 h-5 w-3/4" />
        <Block className="mt-2 h-4 w-full" />
        <Block className="mt-2 h-3 w-40" />
      </div>
    </li>
  );
}

/** Matches the caged card: image over a text block. */
export function CardSkeleton({ ratio = "aspect-[16/9]" }: { ratio?: string }) {
  return (
    <div className="caged border border-rule">
      <Block className={`${ratio} w-full`} />
      <div className="p-6">
        <Block className="h-2.5 w-20" />
        <Block className="mt-3 h-7 w-11/12" />
        <Block className="mt-2 h-4 w-full" />
        <Block className="mt-3 h-3 w-36" />
      </div>
    </div>
  );
}

/** Matches the sidebar / briefing list column. */
export function ListCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="caged border border-rule p-6">
      <Block className="h-2.5 w-28" />
      <div className="mt-4 flex flex-col divide-y divide-rule">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex gap-2.5 py-3 first:pt-0">
            <Block className="mt-1.5 size-1.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <Block className="h-2.5 w-14" />
              <Block className="mt-2 h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { Block as SkeletonBlock };
