"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { blockUser } from "@/app/[locale]/actions/blocks";
import { Icon } from "@/components/echo/icons";
import { ConfirmSheet } from "@/components/library/book-actions-menu";
import { ReportSheet } from "@/components/moderation/report-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ⋯ menu on another reader or one of their reviews: report the review,
 * report the user, block the user.
 */
export function ModerationMenu({
  userId,
  userName,
  reviewId,
}: {
  userId: string;
  userName: string;
  /** Set when the menu sits on a review, to offer reporting it */
  reviewId?: string;
}) {
  const t = useTranslations("moderation");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [report, setReport] = useState<"user" | "review" | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("more", { name: userName })}
            className="grid size-8 flex-none cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-tint hover:text-ink"
          >
            <Icon name="more" size={18} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {reviewId && (
            <DropdownMenuItem onSelect={() => setReport("review")}>
              <Icon name="shield" size={18} />
              {t("reportReview")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setReport("user")}>
            <Icon name="shield" size={18} />
            {t("reportUser")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmBlock(true)}>
            <Icon name="eyeOff" size={18} />
            {t("block")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportSheet
        open={report !== null}
        onOpenChange={(open) => !open && setReport(null)}
        targetType={report ?? "user"}
        targetId={report === "review" && reviewId ? reviewId : userId}
      />

      <ConfirmSheet
        open={confirmBlock}
        onOpenChange={setConfirmBlock}
        title={t("blockConfirmTitle", { name: userName })}
        body={t("blockConfirm")}
        confirmLabel={t("block")}
        cancelLabel={t("cancel")}
        onConfirm={() => {
          setConfirmBlock(false);
          startTransition(async () => {
            const result = await blockUser(userId);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success(t("blocked", { name: userName }));
            router.refresh();
          });
        }}
      />
    </>
  );
}
