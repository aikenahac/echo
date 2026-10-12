import { Skeleton } from "@/components/ui/skeleton";

// Mirrors BookDetails: cover + info column, then a section card
export default function BookLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/3">
            <Skeleton className="w-full aspect-2/3 rounded-lg" />
          </div>
          <div className="md:w-2/3 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-7 w-1/2" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
