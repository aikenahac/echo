"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { redeemPromoCode } from "@/app/[locale]/actions/promo";
import { Capsule } from "@/components/echo/buttons";
import { FieldInput } from "@/components/echo/field-input";
import { Stamp } from "@/components/echo/stamp";

type Redeemed = { planName: string; endsAt: Date | null };

export function RedeemForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations("redeem");
  const format = useFormatter();
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [redeemed, setRedeemed] = useState<Redeemed | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await redeemPromoCode(code);
      if (result.ok) {
        setRedeemed({ planName: result.planName, endsAt: result.endsAt });
        router.refresh();
      } else {
        setError(t(`errors.${result.error}`));
      }
    });
  };

  if (redeemed) {
    return (
      <div className="mt-8">
        <Stamp size="sm" rotate={-4}>
          {redeemed.planName}
        </Stamp>
        <h2 className="mt-5 font-disp text-[32px] leading-none font-bold">{t("successTitle")}</h2>
        <p className="mt-3 text-[15px] text-ink-2">
          {redeemed.endsAt
            ? t("successUntil", {
                date: format.dateTime(new Date(redeemed.endsAt), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }),
              })
            : t("successLifetime")}
        </p>
        <Capsule asChild className="mt-8">
          <Link href="/library">{t("library")}</Link>
        </Capsule>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <FieldInput
        label={t("label")}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={error}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={64}
        inputClassName="uppercase tracking-[2px]"
        required
      />
      <Capsule type="submit" disabled={pending || !code.trim()} className="w-full sm:w-auto">
        {pending ? t("redeeming") : t("submit")}
      </Capsule>
    </form>
  );
}
