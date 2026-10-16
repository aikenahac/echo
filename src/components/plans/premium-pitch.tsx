import { getTranslations } from "next-intl/server";
import { Icon } from "@/components/echo/icons";
import { Stamp } from "@/components/echo/stamp";

const BENEFITS = ["collections", "share", "support", "newfeat"] as const;

/** PREMIUM stamp, the headline and the benefit list, on the field. */
export async function PremiumPitch() {
  const t = await getTranslations("paywall");
  return (
    <div>
      <Stamp size="md" rotate={-5}>
        Premium
      </Stamp>
      <h1 className="font-disp plate mt-6 text-[52px] leading-[.9] tracking-[-0.6px] text-balance md:text-[80px]">
        {t("headline")}
      </h1>
      <ul className="mt-7 max-w-[480px]">
        {BENEFITS.map((b) => (
          <li
            key={b}
            className="flex gap-3 border-t border-[var(--on-field-rule)] py-3 text-[17px] leading-[22px] tracking-[-0.3px]"
          >
            <Icon name="check" size={20} strokeWidth={2.2} className="mt-px" />
            {t(`benefits.${b}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
