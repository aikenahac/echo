import { Skeleton } from "@/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div aria-busy className="mx-auto w-full max-w-[760px] px-5 pt-3 md:px-10 md:pt-10">
      <Skeleton className="h-11 w-40" />
      <div className="mt-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 py-[18px] [&+div]:hairline-t">
            <Skeleton className="size-9 rounded" />
            <div className="flex-1">
              <Skeleton className="h-4 w-2/3" />
              <div className="mt-3 flex items-end gap-3">
                <Skeleton className="aspect-[2/3] w-14 rounded-[2px]" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
