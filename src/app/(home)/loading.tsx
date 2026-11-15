import { Bone, FeedSkeleton, TabsSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      <TabsSkeleton />
      <div className="mb-2 flex gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-8 w-14 rounded-full" />
        ))}
      </div>
      <FeedSkeleton />
    </div>
  );
}
