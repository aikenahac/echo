import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

// X (Twitter) logo - lucide no longer ships brand icons
function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Echo.
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
              aria-label={t("followTwitter")}
            >
              <XLogo className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
