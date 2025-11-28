"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { rateBook } from "@/app/[locale]/actions/books";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RatingFormProps {
  userBookId: string;
  currentRating: number | null;
}

export function RatingForm({ userBookId, currentRating }: RatingFormProps) {
  const t = useTranslations("book.rating");
  const tToast = useTranslations("toast");
  const [rating, setRating] = useState(currentRating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isPending, startTransition] = useTransition();

  const handleRate = (newRating: number) => {
    setRating(newRating);
    startTransition(async () => {
      const result = await rateBook(userBookId, newRating);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tToast("ratingSaved"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        {rating > 0 ? (
          <CardDescription>{t("outOf", { rating })}</CardDescription>
        ) : (
          <CardDescription>{t("prompt")}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Button
              key={star}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRate(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={isPending}
              className="p-1 h-auto"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-muted text-muted"
                }`}
              />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
