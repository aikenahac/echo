"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Link } from "@/i18n/routing";
import { Search, Library, Activity, User, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { Button } from "./ui/button";
import Image from "next/image";

export function Navigation() {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false);

  const navItems = useMemo(
    () => [
      {
        href: "/books/search",
        icon: Search,
        label: t("searchBooks"),
        match: (path: string) => path.includes("/books/search"),
      },
      {
        href: "/library",
        icon: Library,
        label: t("library"),
        match: (path: string) => path.includes("/library"),
      },
      {
        href: "/feed",
        icon: Activity,
        label: t("feed"),
        match: (path: string) => path.includes("/feed"),
      },
      {
        href: "/users/search",
        icon: User,
        label: t("findUsers"),
        match: (path: string) => path.includes("/users/search"),
      },
      {
        href: "/profile",
        icon: User,
        label: t("profile"),
        match: (path: string) => path.includes("/profile"),
      },
    ],
    [t]
  );

  const activeNav = navItems.find((item) => item.match(pathname));

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/echo.svg"
              alt="Echo"
              width={93}
              height={43}
              className="h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <SignedIn>
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <UserButton />
            </div>
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                {t("signIn")}
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        {/* Mobile Navigation */}
        <SignedIn>
          <div className="md:hidden pb-2">
            {!isMobileNavExpanded && activeNav && (
              <div className="flex items-center justify-between py-2">
                <Link
                  href={activeNav.href}
                  className="flex items-center gap-2 text-sm"
                >
                  <activeNav.icon className="h-4 w-4" />
                  {activeNav.label}
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileNavExpanded(true)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}

            {isMobileNavExpanded && (
              <div className="pb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Navigation</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileNavExpanded(false)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.match(pathname);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileNavExpanded(false)}
                        className={`flex items-center gap-2 text-sm transition-colors py-2 px-2 rounded-md ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </SignedIn>
      </div>
    </nav>
  );
}
