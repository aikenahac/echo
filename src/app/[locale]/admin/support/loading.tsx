import { Skeleton } from "@/components/ui/skeleton";

export default function SupportLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <div className="space-y-3 rounded-md border p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
