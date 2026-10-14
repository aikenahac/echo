import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Capsule } from "@/components/echo/buttons";

export default async function SubscriptionCanceledPage() {
  const t = await getTranslations("plans.canceled");
  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-[520px]">
        <h1 className="font-disp text-[44px] leading-[.95] tracking-[-0.4px] md:text-[56px]">
          {t("title")}
        </h1>
        <p className="mt-4 text-[17px] leading-6 text-ink-2">{t("body")}</p>
        <div className="mt-8 flex flex-col gap-2.5">
          <Capsule asChild size="lg">
            <Link href="/subscription">{t("back")}</Link>
          </Capsule>
          <Capsule asChild variant="ghost" size="lg">
            <Link href="/library">{t("library")}</Link>
          </Capsule>
        </div>
      </div>
    </div>
  );
}
