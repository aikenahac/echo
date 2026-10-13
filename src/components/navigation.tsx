"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { EchoMark, Icon, type IconName } from "@/components/echo/icons";

interface NavigationProps {
  hasAdminAccess?: boolean;
  hasPaidPlan?: boolean;
}

// Paths that render without the app chrome (signed-out pages and first run).
const BARE_PATHS = [
  /^\/[a-z]{2}\/?$/,
  /^\/[a-z]{2}\/(sign-in|sign-up|reset-password|sso-callback|pricing|documents)(\/|$)/,
];

export function isBarePath(pathname: string) {
  return BARE_PATHS.some((re) => re.test(pathname));
}

type NavItem = {
  href: string;
  icon: IconName;
  label: string;
  match: (path: string) => boolean;
};

/**
 * App chrome. Wide screens get a left rail; phones get the floating capsule tab
 * bar (Library · Friends · You) with Search as its own round button.
 */
export function Navigation({
  hasAdminAccess = false,
  hasPaidPlan = false,
}: NavigationProps) {
  const t = useTranslations("navigation");
  const pathname = usePathname();

  if (isBarePath(pathname)) return null;

  const tabs: NavItem[] = [
    {
      href: "/library",
      icon: "books",
      label: t("library"),
      match: (p) => p.includes("/library"),
    },
    {
      href: "/feed",
      icon: "friends",
      label: t("feed"),
      match: (p) => p.includes("/feed"),
    },
    {
      href: "/profile",
      icon: "me",
      label: t("profile"),
      match: (p) => p.includes("/profile") || p.includes("/settings"),
    },
  ];
  const search: NavItem = {
    href: "/search",
    icon: "search",
    label: t("search"),
    match: (p) => p.includes("/search"),
  };

  const secondary: NavItem[] = [];
  if (!hasPaidPlan) {
    secondary.push({
      href: "/subscription",
      icon: "premium",
      label: t("premium"),
      match: (p) => p.includes("/subscription"),
    });
  }
  if (hasAdminAccess) {
    secondary.push({
      href: "/admin",
      icon: "shield",
      label: t("admin"),
      match: (p) => p.includes("/admin"),
    });
  }
  secondary.push({
    href: "/settings",
    icon: "gear",
    label: t("settings"),
    match: (p) => p.includes("/settings"),
  });

  return (
    <>
      {/* Wide screens: left rail */}
      <nav
        aria-label={t("main")}
        className="fixed inset-y-0 left-0 z-40 hidden w-[88px] flex-col items-center border-r-[0.5px] border-rule bg-paper py-6 lg:flex xl:w-[232px] xl:items-stretch xl:px-4"
      >
        <Link
          href="/library"
          className="mb-8 flex items-center gap-2.5 xl:px-3"
          aria-label="Echo"
        >
          <EchoMark height={34} />
          <span className="font-disp hidden text-[26px] leading-none xl:inline">
            Echo
          </span>
        </Link>
        <ul className="flex flex-col gap-1">
          {[...tabs, search].map((item) => (
            <RailItem key={item.href} item={item} active={item.match(pathname)} />
          ))}
        </ul>
        <ul className="mt-auto flex flex-col gap-1">
          {secondary.map((item) => (
            <RailItem
              key={item.href}
              item={item}
              active={item.match(pathname)}
              quiet
            />
          ))}
        </ul>
      </nav>

      {/* Phones and tablets: floating tab bar + search button */}
      <nav
        aria-label={t("main")}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex gap-2.5 px-5 pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="glass pointer-events-auto mx-auto flex h-[62px] w-full max-w-[460px] flex-1 items-center rounded-full px-[5px]">
          {tabs.map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-[26px] pt-1.5 pb-[5px] text-[10px] font-semibold",
                    active
                      ? "bg-pink-ink/10 text-pink-ink dark:bg-pink-ink/15"
                      : "text-ink",
                  )}
                >
                  <Icon name={item.icon} size={24} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href={search.href}
          aria-label={search.label}
          aria-current={search.match(pathname) ? "page" : undefined}
          className={cn(
            "glass pointer-events-auto grid size-[62px] flex-none place-items-center rounded-full",
            search.match(pathname) ? "text-pink-ink" : "text-ink",
          )}
        >
          <Icon name="search" size={24} />
        </Link>
      </nav>
    </>
  );
}

function RailItem({
  item,
  active,
  quiet,
}: {
  item: NavItem;
  active: boolean;
  quiet?: boolean;
}) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={item.label}
        className={cn(
          "flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors xl:flex-row xl:gap-3 xl:px-3 xl:py-2.5 xl:font-semibold",
          quiet ? "xl:text-[15px]" : "xl:text-[17px]",
          active
            ? "bg-pink-ink/10 text-pink-ink dark:bg-pink-ink/15"
            : cn("hover:bg-tint", quiet ? "text-ink-2" : "text-ink"),
        )}
      >
        <Icon name={item.icon} size={quiet ? 22 : 24} />
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

/**
 * Wraps page content so it clears the rail (wide) or the floating tab bar
 * (phones). Bare pages render edge to edge.
 */
export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const bare = isBarePath(pathname);
  return (
    <main
      className={cn(
        "min-h-dvh",
        !bare &&
          "pb-[calc(110px+env(safe-area-inset-bottom))] lg:pb-16 lg:pl-[88px] xl:pl-[232px]",
      )}
    >
      {children}
    </main>
  );
}
