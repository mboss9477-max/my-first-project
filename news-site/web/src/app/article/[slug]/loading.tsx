import { LoadingAnnouncement, SkeletonBlock } from "@/components/Skeletons";

/** Mirrors the article page: kicker, headline, standfirst, hero, body. */
export default function ArticleLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <LoadingAnnouncement label="Loading article" />

      <SkeletonBlock className="h-4 w-40" />

      <div className="mt-8">
        <SkeletonBlock className="h-2.5 w-20" />
        <SkeletonBlock className="mt-3 h-10 w-full" />
        <SkeletonBlock className="mt-2 h-10 w-4/5" />

        <SkeletonBlock className="mt-5 h-4 w-full" />
        <SkeletonBlock className="mt-2 h-4 w-3/4" />

        <SkeletonBlock className="mt-4 h-3 w-52" />

        <SkeletonBlock className="mt-8 aspect-[3/2] w-full" />

        <div className="mt-8">
          {[
            "w-full",
            "w-11/12",
            "w-full",
            "w-4/5",
            "w-full",
            "w-2/3",
          ].map((width, index) => (
            <SkeletonBlock key={index} className={`mt-3 h-4 ${width}`} />
          ))}
        </div>
      </div>
    </main>
  );
}
