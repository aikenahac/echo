"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Link } from "@/i18n/routing";
import { Search, Library, Activity, User } from "lucide-react";
import { useTranslations } from "next-intl";

export function Navigation() {
  const t = useTranslations("navigation");

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold">
            {t("home")}
          </Link>

          {/* Desktop Navigation */}
          <SignedIn>
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/books/search"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Search className="h-4 w-4" />
                {t("searchBooks")}
              </Link>
              <Link
                href="/library"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Library className="h-4 w-4" />
                {t("library")}
              </Link>
              <Link
                href="/feed"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Activity className="h-4 w-4" />
                {t("feed")}
              </Link>
              <Link
                href="/users/search"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <User className="h-4 w-4" />
                {t("findUsers")}
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                {t("profile")}
              </Link>
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
          <div className="md:hidden pb-4">
            <div className="flex flex-col gap-2">
              <Link
                href="/books/search"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-2"
              >
                <Search className="h-4 w-4" />
                {t("searchBooks")}
              </Link>
              <Link
                href="/library"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-2"
              >
                <Library className="h-4 w-4" />
                {t("library")}
              </Link>
              <Link
                href="/feed"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-2"
              >
                <Activity className="h-4 w-4" />
                {t("feed")}
              </Link>
              <Link
                href="/users/search"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-2"
              >
                <User className="h-4 w-4" />
                {t("findUsers")}
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors py-2"
              >
                {t("profile")}
              </Link>
            </div>
          </div>
        </SignedIn>
      </div>
    </nav>
  );
}
