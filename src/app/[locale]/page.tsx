import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { EchoMark } from "@/components/echo/icons";
import { CoverFan } from "@/components/auth/cover-fan";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export default async function WelcomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { userId } = await auth();
  if (userId) redirect({ href: "/library", locale });

  const t = await getTranslations("auth");
  const tNav = await getTranslations("navigation");

  const legal = t.rich("legal", {
    terms: (chunks) => (
      <Link href="/documents/terms-of-service" className="underline underline-offset-2">
        {chunks}
      </Link>
    ),
    privacy: (chunks) => (
      <Link href="/documents/privacy-policy" className="underline underline-offset-2">
        {chunks}
      </Link>
    ),
  });

  return (
    <div className="on-field min-h-dvh bg-field">
      <div className="mx-auto flex min-h-dvh max-w-[1180px] flex-col px-5 pt-[max(20px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] md:px-10">
        <header className="flex h-12 items-center justify-between">
          <span className="flex items-center gap-2.5">
            <EchoMark height={28} className="hidden md:block" />
            <span className="font-disp text-[22px] leading-none md:text-[26px]">Echo</span>
          </span>
          <nav className="flex items-center gap-5 text-[15px] font-semibold">
            <Link href="/pricing" className="hover:underline">
              {tNav("pricing")}
            </Link>
            <Link href="/sign-in" className="hidden hover:underline md:inline">
              {t("signIn.title")}
            </Link>
          </nav>
        </header>

        <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16">
          <div className="order-1 flex flex-1 items-center justify-center py-6 max-[700px]:hidden lg:order-2 lg:py-0">
            <CoverFan width={150} className="md:hidden" />
            <CoverFan width={210} className="hidden md:flex" />
          </div>

          <div className="order-2 flex flex-col lg:order-1 lg:py-16">
            <h1 className="font-disp plate text-[64px] leading-[.9] tracking-[-0.6px] text-balance max-[700px]:mt-10 max-[700px]:text-[52px] md:text-[96px] xl:text-[112px]">
              {t("headline")}
            </h1>
            <p className="mt-5 max-w-[30ch] text-[17px] leading-6 text-on-field-2 md:text-[20px] md:leading-7">
              {t("sub")}
            </p>
            <div className="mt-8 w-full md:max-w-[400px]">
              <OAuthButtons />
              <Link
                href="/sign-in"
                className="mt-2 flex h-12 items-center justify-center text-[17px] font-semibold hover:underline"
              >
                {t("useEmail")}
              </Link>
              <p className="mt-3 text-center text-[13px] text-on-field-2">{legal}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
