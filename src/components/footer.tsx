"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Twitter } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aerio, Aiken Tine Ahac s.p.
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-6 text-sm">
              <Link
                href="/documents/privacy-policy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("privacyPolicy")}
              </Link>
              <Link
                href="/documents/terms-of-service"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("termsOfService")}
              </Link>
              <Link
                href="/documents"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("legalDocuments")}
              </Link>
            </div>
            <div className="h-4 w-px bg-border" />
            <a
              href="https://x.com/aikenahac"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Follow on X (Twitter)"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
