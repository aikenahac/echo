import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Capsule } from "@/components/echo/buttons";
import { Stamp } from "@/components/echo/stamp";

export default async function SubscriptionSuccessPage() {
  const t = await getTranslations("plans.success");
  return (
    <section className="on-field grid min-h-dvh place-items-center bg-field px-5">
      <div className="w-full max-w-[520px]">
        <Stamp size="lg" animate>
          Premium
        </Stamp>
        <h1 className="font-disp plate mt-8 text-[52px] leading-[.9] tracking-[-0.6px] md:text-[64px]">
          {t("title")}
        </h1>
        <p className="mt-4 text-[17px] leading-6 text-on-field-2">{t("body")}</p>
        <Capsule asChild variant="field" size="lg" className="mt-8 w-full">
          <Link href="/library">{t("library")}</Link>
        </Capsule>
      </div>
    </section>
  );
}
