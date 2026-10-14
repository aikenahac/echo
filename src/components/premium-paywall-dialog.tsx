"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Capsule } from "@/components/echo/buttons";
import { Icon } from "@/components/echo/icons";
import { Sheet, SheetClose, SheetContent } from "@/components/echo/sheet";
import { Stamp } from "@/components/echo/stamp";
import { usePaymentsComingSoon } from "@/components/plans/payments-provider";

interface PremiumPaywallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BENEFITS = ["collections", "share", "free", "support"] as const;

/**
 * The Premium paywall: a full pink page with the PREMIUM stamp, shown to free
 * users on any collection action.
 */
export function PremiumPaywallDialog({
  open,
  onOpenChange,
}: PremiumPaywallDialogProps) {
  const router = useRouter();
  const t = useTranslations("paywall");
  const comingSoon = usePaymentsComingSoon();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent tone="field" size="full" title={t("headline")} hideTitle>
        <div className="flex min-h-full flex-col">
          <div className="flex items-center justify-between">
            <span className="font-disp text-[22px] leading-none">Echo</span>
            <SheetClose
              aria-label={t("close")}
              className="glass grid size-11 cursor-pointer place-items-center rounded-full"
            >
              <Icon name="close" size={18} />
            </SheetClose>
          </div>
          <div className="mt-6 self-start">
            <Stamp size="md" rotate={-5}>
              Premium
            </Stamp>
          </div>
          <p
            aria-hidden
            className="font-disp plate mt-6 text-[52px] leading-[.9] tracking-[-0.6px] text-balance md:text-[64px]"
          >
            {t("headline")}
          </p>
          <ul className="mt-7">
            {BENEFITS.map((b) => (
              <li
                key={b}
                className="flex gap-3 border-t border-[var(--on-field-rule)] py-3 text-[17px] leading-[22px] tracking-[-0.3px] [@media(max-height:700px)]:[&:nth-child(n+4)]:hidden"
              >
                <Icon name="check" size={20} strokeWidth={2.2} className="mt-px" />
                {t(`benefits.${b}`)}
              </li>
            ))}
          </ul>
          {comingSoon && (
            <p className="mt-auto pt-8 text-[13px] font-semibold tracking-[1px] uppercase text-on-field">
              {t("comingSoon")}
            </p>
          )}
          <p
            className={`${comingSoon ? "pt-1" : "mt-auto pt-8"} text-[15px] text-on-field-2`}
          >
            {t.rich("price", {
              b: (chunks) => <b className="font-semibold text-on-field">{chunks}</b>,
            })}
          </p>
          <Capsule
            variant="field"
            size="lg"
            className="mt-3.5 w-full"
            onClick={() => {
              onOpenChange(false);
              router.push("/subscription");
            }}
          >
            {t("continue")}
          </Capsule>
          <SheetClose className="mt-1.5 h-11 cursor-pointer text-[17px] font-semibold">
            {t("later")}
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
