import { getTranslations } from "next-intl/server";
import { SupportForm } from "@/components/support/support-form";

export async function generateMetadata() {
  const t = await getTranslations("support");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: true, follow: true },
    alternates: { canonical: "/en/support" },
  };
}

export default async function SupportPage() {
  const t = await getTranslations("support");

  return (
    <main>
      <h1 className="font-disp text-[44px] leading-none md:text-[56px]">
        {t("title")}
      </h1>
      <p className="mt-3 mb-8 text-[17px] leading-6 text-ink-2">{t("intro")}</p>
      <SupportForm />
    </main>
  );
}
