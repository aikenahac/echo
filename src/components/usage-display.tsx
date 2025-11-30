"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getUserUsageStats } from "@/app/[locale]/actions/subscriptions";
import { format } from "date-fns";

export function UsageDisplay({ userId }: { userId: string }) {
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      const result = await getUserUsageStats();
      if (!result.error) {
        setUsage(result);
      }
      setLoading(false);
    }
    fetchUsage();
  }, [userId]);

  if (loading) {
    return (
      <Card className="mt-4">
        <CardContent className="pt-6">Loading...</CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const { booksAdded, limit, periodStart, periodEnd, hasUnlimited } = usage;
  const percentage = limit ? (booksAdded / limit) * 100 : 0;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Usage This Year</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Books Added</span>
            <span className="text-sm font-medium">
              {hasUnlimited ? (
                <span>{booksAdded} books</span>
              ) : (
                <span>
                  {booksAdded} / {limit} books
                </span>
              )}
            </span>
          </div>
          {!hasUnlimited && <Progress value={percentage} className="h-2" />}
        </div>

        <div className="text-xs text-muted-foreground">
          <p>
            Period: {format(new Date(periodStart), "MMM d, yyyy")} -{" "}
            {format(new Date(periodEnd), "MMM d, yyyy")}
          </p>
        </div>

        {!hasUnlimited && percentage >= 80 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {percentage >= 100
                ? "You've reached your limit! Upgrade to add more books."
                : "You're approaching your limit. Consider upgrading to Premium!"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
