import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the profile layout: header, stats, edit form and book shelves
export default function ProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-6 flex flex-col items-center gap-2">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>

        <Skeleton className="h-24 w-full rounded-lg" />

        {Array.from({ length: 2 }).map((_, shelf) => (
          <div key={shelf}>
            <Skeleton className="h-8 w-56 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
