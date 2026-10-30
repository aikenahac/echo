import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { getViewer } from "@/lib/auth";
import { ScreenTitle } from "@/components/echo/primitives";
import { RedeemForm } from "@/components/plans/redeem-form";

export async function generateMetadata() {
  const t = await getTranslations("redeem");
  return { title: t("title") };
}

export default async function RedeemPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const [{ locale }, { code }] = await Promise.all([params, searchParams]);

  const user = await getViewer();
  if (!user) {
    return redirect({ href: "/sign-in", locale });
  }

  const t = await getTranslations("redeem");

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-12 md:px-10 md:pt-10">
      <div className="flex h-[52px] items-center">
        <ScreenTitle>{t("title")}</ScreenTitle>
      </div>
      <p className="text-[15px] text-ink-2">{t("body")}</p>
      <RedeemForm initialCode={typeof code === "string" ? code.slice(0, 64) : ""} />
    </div>
  );
}
