import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div aria-busy>
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-16 md:px-10 md:pt-20">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-md md:size-24" />
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-5 w-28" />
          </div>
        </div>
        <Skeleton className="mt-5 h-5 w-full max-w-md" />
        <Skeleton className="mt-8 h-24 w-56" />
      </div>
      <div className="mt-8 h-56 bg-field" />
    </div>
  );
}
