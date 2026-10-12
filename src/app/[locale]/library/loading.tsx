import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the LibraryIsland layout: sidebar with tabs + grid of book cards
export default function LibraryLoading() {
  return (
    <div className="w-full h-[80vh] flex flex-col md:flex-row gap-4">
      {/* Mobile menu button */}
      <div className="md:hidden flex items-center gap-2 pb-2">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Sidebar */}
      <Card className="hidden md:flex rounded-md border border-gray-200 shadow flex-col gap-2 p-4 h-full w-64">
        <div className="flex justify-end gap-1 mb-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
        <Skeleton className="h-px w-full my-4" />
        <Skeleton className="h-4 w-24 mx-2" />
        <Skeleton className="h-7 w-full" />
        <Skeleton className="h-7 w-full" />
      </Card>

      {/* Main content */}
      <Card className="flex-1 h-full overflow-hidden p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-64 w-full rounded-b-none" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
