import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Icon } from "@/components/echo/icons";

export async function generateMetadata() {
  const t = await getTranslations("documents");

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

const DOCUMENTS = [
  {
    key: "privacy",
    href: "/documents/privacy-policy",
    lastUpdated: "November 29, 2025",
  },
  {
    key: "terms",
    href: "/documents/terms-of-service",
    lastUpdated: "November 29, 2025",
  },
] as const;

export default async function DocumentsPage() {
  const t = await getTranslations("documents");

  return (
    <div>
      <h1 className="font-disp text-[44px] leading-[.95] tracking-[-0.4px] md:text-[56px]">
        {t("title")}
      </h1>
      <p className="mt-3 text-[17px] leading-6 text-ink-2">{t("subtitle")}</p>

      <ul className="mt-8">
        {DOCUMENTS.map((doc) => (
          <li key={doc.href} className="[&+li]:hairline-t">
            <Link
              href={doc.href}
              className="flex items-center gap-4 py-4 hover:opacity-80"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">
                  {t(`${doc.key}.title`)}
                </span>
                <span className="block text-[15px] text-ink-2">
                  {t(`${doc.key}.description`)}
                </span>
                <span className="block text-[13px] text-ink-3">
                  {t("lastUpdated", { date: doc.lastUpdated })}
                </span>
              </span>
              <Icon name="forward" size={18} className="text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-[15px] text-ink-2">
        {t("futureDocuments.description")}
      </p>
      <p className="mt-4 text-[15px] text-ink-2">
        {t("contact.text")}{" "}
        <a
          href="mailto:me@aiken.si"
          className="font-semibold text-pink-ink hover:underline"
        >
          {t("contact.link")}
        </a>
      </p>
    </div>
  );
}
