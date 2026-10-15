import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { EchoMark } from "@/components/echo/icons";

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
    <footer className="hairline-t">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-5 py-8 text-[13px] text-ink-2 md:flex-row md:items-center md:justify-between md:px-10">
        <div className="flex items-center gap-2">
          <EchoMark height={20} />© {new Date().getFullYear()} Echo
        </div>
        <div className="flex items-center gap-5">
          <Link href="/documents/privacy-policy" className="hover:text-ink">
            {t("privacyPolicy")}
          </Link>
          <Link href="/documents/terms-of-service" className="hover:text-ink">
            {t("termsOfService")}
          </Link>
          <Link href="/support" className="hover:text-ink">
            {t("support")}
          </Link>
          <Link href="/documents" className="hover:text-ink">
            {t("legalDocuments")}
          </Link>
          <a
            href="https://openlibrary.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
          >
            {t("bookData")}
          </a>
          <a
            href="https://x.com/aikenahac"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink"
            aria-label={t("followTwitter")}
          >
            <XLogo className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
