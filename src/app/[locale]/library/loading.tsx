import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the Reading shelf: the field hero, then "Also reading" rows
export default function LibraryLoading() {
  return (
    <div aria-busy>
      <div className="on-field bg-field">
        <div className="mx-auto w-full max-w-[1180px] px-5 pt-3 pb-8 md:px-10 md:pt-10 md:pb-12">
          <Skeleton className="h-11 w-40 bg-black/10" />
          <Skeleton className="mt-5 h-6 w-72 bg-black/10" />
          <div className="mt-8 flex items-end gap-5 md:gap-10">
            <Skeleton className="aspect-[2/3] w-[140px] rounded-[3px] bg-black/10 md:w-[220px]" />
            <div className="flex-1">
              <Skeleton className="h-24 w-40 bg-black/10 md:h-32 md:w-56" />
              <Skeleton className="mt-4 h-5 w-32 bg-black/10" />
            </div>
          </div>
          <Skeleton className="mt-8 h-[52px] w-full rounded-full bg-black/10 md:w-[480px]" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-8 md:px-10">
        <Skeleton className="h-4 w-24" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3.5 py-3">
            <Skeleton className="aspect-[2/3] w-10 rounded-[2px]" />
            <div className="flex-1">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-1 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
