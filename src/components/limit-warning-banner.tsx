"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { getUserUsageStats } from "@/app/[locale]/actions/subscriptions";
import { Link } from "@/i18n/routing";

export function LimitWarningBanner() {
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    async function fetchUsage() {
      const result = await getUserUsageStats();
      if (!result.error) {
        setUsage(result);
      }
    }
    fetchUsage();
  }, []);

  if (!usage || usage.hasUnlimited) return null;

  const { booksAdded, limit } = usage;
  const percentage = (booksAdded / limit) * 100;

  if (percentage < 80) return null; // Only show when approaching limit

  return (
    <Alert variant={percentage >= 100 ? "destructive" : "default"}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {percentage >= 100 ? "Limit Reached" : "Approaching Limit"}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You've used {booksAdded} of {limit} books this year.
          {percentage >= 100 && " Upgrade to add more books!"}
        </span>
        <Button asChild size="sm" variant="outline">
          <Link href="/subscription">Upgrade</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
