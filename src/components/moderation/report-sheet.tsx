"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { reportReview, reportUser } from "@/app/[locale]/actions/reports";
import { Capsule } from "@/components/echo/buttons";
import { FieldInput } from "@/components/echo/field-input";
import { Sheet, SheetContent } from "@/components/echo/sheet";
import {
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/reports";

/** Pick a reason (and optional details) and report a user or review. */
export function ReportSheet({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const t = useTranslations("moderation");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!reason) return;
    startTransition(async () => {
      const input = { targetId, reason, details };
      const result =
        targetType === "user" ? await reportUser(input) : await reportReview(input);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("reported"));
      setReason(null);
      setDetails("");
      onOpenChange(false);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={targetType === "user" ? t("reportUserTitle") : t("reportReviewTitle")}
        description={t("reportBody")}
        className="md:w-[460px]"
      >
        <fieldset className="flex flex-col">
          <legend className="sr-only">{t("reason")}</legend>
          {REPORT_REASONS.map((value) => (
            <label
              key={value}
              className="flex min-h-[48px] cursor-pointer items-center gap-3 text-[17px] [&+label]:hairline-t"
            >
              <input
                type="radio"
                name="report-reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="size-[18px] accent-ink"
              />
              {t(`reasons.${value}`)}
            </label>
          ))}
        </fieldset>
        <FieldInput
          multiline
          className="mt-4"
          label={t("details")}
          placeholder={t("detailsPlaceholder")}
          maxLength={REPORT_DETAILS_MAX}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="mt-5 flex flex-col gap-2.5">
          <Capsule onClick={submit} disabled={!reason || pending}>
            {t("submit")}
          </Capsule>
          <Capsule variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Capsule>
        </div>
      </SheetContent>
    </Sheet>
  );
}
