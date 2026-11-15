import { ListSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return <ListSkeleton width="max-w-2xl" avatar={false} tabs={2} />;
}
