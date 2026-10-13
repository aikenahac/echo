import { Skeleton } from "@/components/ui/skeleton";

export default function BookDetailLoading() {
  return (
    <div aria-busy className="mx-auto w-full max-w-[1180px] px-5 pt-3 md:px-10 md:pt-8">
      <Skeleton className="size-11 rounded-full" />
      <div className="mt-6 flex items-start gap-[18px] md:gap-10">
        <Skeleton className="aspect-[2/3] w-[150px] rounded-[3px] md:w-[240px]" />
        <div className="flex-1 pt-1">
          <Skeleton className="h-11 w-3/4" />
          <Skeleton className="mt-4 h-5 w-1/2" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-10 h-7 w-40" />
      <Skeleton className="mt-4 h-20 w-full max-w-xl" />
    </div>
  );
}
