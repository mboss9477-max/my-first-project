import {
  CardSkeleton,
  ListCardSkeleton,
  LoadingAnnouncement,
} from "@/components/Skeletons";

/** Mirrors the homepage cage: lead + sidebar, then feature + briefing. */
export default function HomeLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <LoadingAnnouncement label="Loading the front page" />

      <div className="grid lg:grid-cols-[1fr_20rem]">
        <CardSkeleton ratio="aspect-[16/9]" />
        <div className="-mt-px lg:mt-0 lg:-ml-px">
          <ListCardSkeleton rows={4} />
        </div>
      </div>

      <div className="-mt-px grid lg:grid-cols-[1.1fr_1fr]">
        <CardSkeleton ratio="aspect-[16/9]" />
        <div className="-mt-px lg:mt-0 lg:-ml-px">
          <ListCardSkeleton rows={3} />
        </div>
      </div>
    </main>
  );
}
