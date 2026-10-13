import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { EchoMark, Icon } from "@/components/echo/icons";
import { CoverFan } from "./cover-fan";

/**
 * Signed-out page frame. Wide screens: the pink field with the cover fan on the
 * left, the form on paper on the right. Phones: paper with a back button.
 */
export async function AuthShell({
  children,
  backHref = "/",
}: {
  children: React.ReactNode;
  backHref?: string;
}) {
  const t = await getTranslations("auth");
  return (
    <div className="flex min-h-dvh">
      <aside className="on-field relative hidden w-[46%] max-w-[720px] flex-col justify-between overflow-hidden bg-field p-12 lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <EchoMark height={34} />
          <span className="font-disp text-[26px] leading-none">Echo</span>
        </Link>
        <CoverFan width={180} className="my-10" />
        <p className="font-disp plate text-[64px] leading-[.9] tracking-[-0.6px] xl:text-[80px]">
          {t("headline")}
        </p>
      </aside>
      <div className="flex min-h-dvh flex-1 flex-col px-5 pt-[max(16px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] md:px-10">
        <div className="lg:invisible">
          <Link
            href={backHref}
            aria-label={t("back")}
            className="glass grid size-11 place-items-center rounded-full"
          >
            <Icon name="back" />
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col pt-8 lg:justify-center lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
