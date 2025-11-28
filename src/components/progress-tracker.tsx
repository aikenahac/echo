"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateReadingProgress } from "@/app/[locale]/actions/books";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartyPopper } from "lucide-react";

interface ProgressTrackerProps {
  userBookId: string;
  currentPage: number;
  totalPages: number;
}

export function ProgressTracker({
  userBookId,
  currentPage,
  totalPages,
}: ProgressTrackerProps) {
  const t = useTranslations("book.progress");
  const tToast = useTranslations("toast");
  const [page, setPage] = useState(currentPage.toString());
  const [isPending, startTransition] = useTransition();

  const progressPercentage = Math.round((currentPage / totalPages) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(page);

    if (isNaN(pageNum) || pageNum < 0) {
      toast.error(tToast("errors.invalidPage"));
      return;
    }

    if (pageNum > totalPages) {
      toast.error(tToast("errors.pageExceedsTotal", { total: totalPages }));
      return;
    }

    startTransition(async () => {
      const result = await updateReadingProgress(userBookId, pageNum);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("progressUpdated"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>
              {currentPage} / {totalPages} pages ({progressPercentage}%)
            </span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="currentPage" className="sr-only">
              {t("currentPage")}
            </Label>
            <Input
              id="currentPage"
              type="number"
              min="0"
              max={totalPages}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder={t("currentPage")}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("updating") : t("updateButton")}
          </Button>
        </form>

        {currentPage >= totalPages && (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <PartyPopper className="h-4 w-4" />
            <p>{t("congratulations")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
