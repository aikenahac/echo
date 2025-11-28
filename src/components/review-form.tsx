"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createOrUpdateReview, deleteReview } from "@/app/[locale]/actions/reviews";
import type { reviews } from "@/db/schema";
import type { InferSelectModel } from "drizzle-orm";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

type Review = InferSelectModel<typeof reviews>;

interface ReviewFormProps {
  bookId: string;
  existingReview: Review | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function ReviewForm({
  bookId,
  existingReview,
  onCancel,
  onSuccess,
}: ReviewFormProps) {
  const t = useTranslations("book.review");
  const tToast = useTranslations("toast");
  const [content, setContent] = useState(existingReview?.content || "");
  const [isPrivate, setIsPrivate] = useState(existingReview?.isPrivate || false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error(tToast("errors.reviewContentEmpty"));
      return;
    }

    startTransition(async () => {
      const result = await createOrUpdateReview(bookId, content, isPrivate);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          existingReview ? tToast("reviewUpdated") : tToast("reviewPosted")
        );
        onSuccess();
      }
    });
  };

  const handleDelete = () => {
    if (!existingReview) return;
    if (!confirm(t("deleteConfirm"))) return;

    startTransition(async () => {
      const result = await deleteReview(existingReview.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("reviewDeleted"));
        onSuccess();
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingReview ? t("edit") : t("write")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="review" className="sr-only">
              Review
            </Label>
            <Textarea
              id="review"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("placeholder")}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="private"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="private" className="text-sm font-normal cursor-pointer">
              {t("private")}
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? t("updating")
              : existingReview
              ? t("update")
              : t("post")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
          {existingReview && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="ml-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("delete")}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
