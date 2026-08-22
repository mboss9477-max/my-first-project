import {
  ArticleRowSkeleton,
  LoadingAnnouncement,
  SkeletonBlock,
} from "@/components/Skeletons";

/** Mirrors the category page: title block, then a list of article rows. */
export default function CategoryLoading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <LoadingAnnouncement label="Loading section" />

      <SkeletonBlock className="h-4 w-40" />

      <div className="mt-6 border-b border-rule pb-6">
        <SkeletonBlock className="h-10 w-48" />
        <SkeletonBlock className="mt-3 h-3 w-24" />
      </div>

      <ul className="mt-2 divide-y divide-rule">
        {Array.from({ length: 4 }).map((_, index) => (
          <ArticleRowSkeleton key={index} />
        ))}
      </ul>
    </main>
  );
}
