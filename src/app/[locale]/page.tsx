import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { EchoMark } from "@/components/echo/icons";
import { CoverFan } from "@/components/auth/cover-fan";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import Image from "next/image";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/app-links";

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
          <div className="order-1 flex flex-1 items-center justify-center py-6 [@media(max-height:700px)]:hidden lg:order-2 lg:py-0">
            <CoverFan width={150} className="md:hidden" />
            <CoverFan width={210} className="hidden md:flex" />
          </div>

          <div className="order-2 flex flex-col lg:order-1 lg:py-16">
            <h1 className="font-disp plate text-[64px] leading-[.9] tracking-[-0.6px] text-balance [@media(max-height:700px)]:mt-10 [@media(max-height:700px)]:text-[52px] md:text-[96px] xl:text-[112px]">
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
              <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-[13px] font-semibold text-on-field-2">{t("getApp")}</p>
                <div className="flex items-center gap-3">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                    <Image
                      src="/badges/app-store.svg"
                      alt="Download on the App Store"
                      width={120}
                      height={40}
                      unoptimized
                      className="h-10 w-auto"
                    />
                  </a>
                  {/* Google's badge carries transparent padding; size it so the visible badge matches Apple's 40px. */}
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-mx-[9px] -my-[9px]"
                  >
                    <Image
                      src="/badges/google-play.png"
                      alt="Get it on Google Play"
                      width={150}
                      height={58}
                      unoptimized
                      className="h-[58px] w-auto"
                    />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
