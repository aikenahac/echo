import { getFormatter, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { getViewer, isPaidPlan } from "@/lib/auth";
import { getAppearance } from "@/lib/appearance";
import { getLibraryLayout } from "@/lib/library-layout";
import { Icon } from "@/components/echo/icons";
import { AvatarTile, GroupLabel, ScreenTitle } from "@/components/echo/primitives";
import { Stamp } from "@/components/echo/stamp";
import {
  AccountRow,
  AppearanceRow,
  BillingRow,
  DeleteAccountRow,
  LayoutRow,
  SignOutRow,
} from "@/components/settings/settings-controls";

export async function generateMetadata() {
  const t = await getTranslations("settingsPage");
  return { title: t("title") };
}

const row = "flex min-h-[52px] items-center gap-3 py-3 text-[17px]";

function Group({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      {label && <GroupLabel className="mb-1">{label}</GroupLabel>}
      <div className="[&>*+*]:hairline-t">{children}</div>
    </section>
  );
}

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Cached per request (also used by the layout)
  const user = await getViewer();
  if (!user) {
    return redirect({ href: "/", locale });
  }

  const [t, format, appearance, layout] = await Promise.all([
    getTranslations("settingsPage"),
    getFormatter(),
    getAppearance(),
    getLibraryLayout(),
  ]);

  const subscription = user.subscription;
  const plan = subscription?.plan;
  const paid = isPaidPlan(plan);
  const promo = subscription?.source === "promo";
  // A promo grant's term comes from the code, not the plan's interval
  const lifetime = promo ? !subscription.currentPeriodEnd : plan?.interval === "lifetime";
  const name = user.displayName || user.username || user.email;
  const longDate = (d: Date) =>
    format.dateTime(d, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 pt-[max(12px,env(safe-area-inset-top))] pb-12 md:px-10 md:pt-10">
      <div className="flex h-[52px] items-center">
        <ScreenTitle>{t("title")}</ScreenTitle>
      </div>

      <Group>
        <AccountRow
          name={name}
          email={user.email}
          isAdmin={user.role === "admin"}
          avatar={<AvatarTile name={name} src={user.profilePictureUrl} blurhash={user.profilePictureBlurhash} size={44} />}
          profile={{
            username: user.username,
            displayName: user.displayName,
            bio: user.bio,
            profilePictureUrl: user.profilePictureUrl,
            profilePictureBlurhash: user.profilePictureBlurhash,
          }}
        />
      </Group>

      <Group label={t("plan")}>
        {paid && plan ? (
          <>
            <div className={row}>
              <span className="flex-1">{plan.name}</span>
              {lifetime && (
                <Stamp size="xs" rotate={-4}>
                  {t("lifetime")}
                </Stamp>
              )}
            </div>
            {promo ? (
              <>
                <div className={row}>
                  <span className="flex-1">{t("promoGrant")}</span>
                  <span className="text-ink-2 tnum">{longDate(subscription.currentPeriodStart ?? subscription.createdAt)}</span>
                </div>
                {subscription.currentPeriodEnd && (
                  <>
                    <div className={row}>
                      <span className="flex-1">{t("expires")}</span>
                      <span className="text-ink-2 tnum">{longDate(subscription.currentPeriodEnd)}</span>
                    </div>
                    <Link href="/subscription" className={`${row} text-pink-ink`}>
                      <span className="flex-1 font-semibold">{t("managePlans")}</span>
                      <Icon name="forward" size={16} />
                    </Link>
                  </>
                )}
              </>
            ) : lifetime ? (
              <div className={row}>
                <span className="flex-1">{t("paidOnce")}</span>
                <span className="text-ink-2 tnum">{longDate(subscription.currentPeriodStart ?? subscription.createdAt)}</span>
              </div>
            ) : subscription?.currentPeriodEnd ? (
              <div className={row}>
                <span className="flex-1">
                  {subscription.cancelAtPeriodEnd ? t("expires") : t("renews")}
                </span>
                <span className="text-ink-2 tnum">
                  {longDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            ) : null}
            {subscription?.source === "lemonsqueezy" && subscription.lemonSqueezySubscriptionId && <BillingRow />}
            {(subscription?.source === "app_store" || subscription?.source === "play_store") && (
              <div className={row}>
                <span className="text-ink-2">
                  {t(subscription.source === "app_store" ? "managedInAppStore" : "managedInGooglePlay")}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={row}>
              <span className="flex-1">{t("free")}</span>
            </div>
            <Link href="/subscription" className={`${row} text-pink-ink`}>
              <span className="flex-1">
                <span className="block font-semibold">{t("premiumRow")}</span>
                <span className="block text-[13px] text-ink-2">{t("premiumUpsell")}</span>
              </span>
              <Icon name="forward" size={16} />
            </Link>
            <Link href="/redeem" className={row}>
              <span className="flex-1">{t("redeemCode")}</span>
              <Icon name="forward" size={16} className="text-ink-3" />
            </Link>
          </>
        )}
      </Group>

      <Group label={t("app")}>
        <AppearanceRow initial={appearance} />
        <div className={row}>
          <span className="flex-1">{t("language")}</span>
          <span className="text-ink-2">{t("languageValue")}</span>
        </div>
        <LayoutRow initial={layout} />
      </Group>

      <Group label={t("privacyGroup")}>
        <Link href="/settings/blocked" className={row}>
          <span className="flex-1">{t("blockedUsers")}</span>
          <Icon name="forward" size={16} className="text-ink-3" />
        </Link>
      </Group>

      <Group label={t("legal")}>
        <Link href="/documents/terms-of-service" className={row}>
          <span className="flex-1">{t("terms")}</span>
          <Icon name="forward" size={16} className="text-ink-3" />
        </Link>
        <Link href="/documents/privacy-policy" className={row}>
          <span className="flex-1">{t("privacy")}</span>
          <Icon name="forward" size={16} className="text-ink-3" />
        </Link>
      </Group>

      <Group>
        <SignOutRow />
        <DeleteAccountRow />
      </Group>

      <p className="mt-10 text-center text-[13px] text-ink-3">{t("version")}</p>
    </div>
  );
}
