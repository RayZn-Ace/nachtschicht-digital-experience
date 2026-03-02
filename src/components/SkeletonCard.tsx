import { Skeleton } from "@/components/ui/skeleton";

export const EventSkeletonCard = () => (
  <div className="glass-card overflow-hidden">
    <Skeleton className="h-56 w-full rounded-none" />
    <div className="p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-md mt-2" />
    </div>
  </div>
);

export const AlbumSkeletonCard = () => (
  <div className="glass-card overflow-hidden">
    <Skeleton className="h-56 w-full rounded-none" />
    <div className="p-5 space-y-2">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </div>
);

export const PhotoSkeletonGrid = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <Skeleton key={i} className="aspect-[4/5] w-full rounded-lg" />
    ))}
  </div>
);
