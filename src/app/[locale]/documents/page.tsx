import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { FileText, Shield, Scale } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata() {
  const t = await getTranslations("documents");

  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function DocumentsPage() {
  const t = await getTranslations("documents");

  const documents = [
    {
      titleKey: "privacy.title",
      descriptionKey: "privacy.description",
      href: "/documents/privacy-policy",
      icon: Shield,
      lastUpdated: "November 29, 2025",
    },
    {
      titleKey: "terms.title",
      descriptionKey: "terms.description",
      href: "/documents/terms-of-service",
      icon: Scale,
      lastUpdated: "November 29, 2025",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
        <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {documents.map((doc) => {
          const Icon = doc.icon;
          return (
            <Link key={doc.href} href={doc.href}>
              <Card className="h-full hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-2">{t(doc.titleKey)}</CardTitle>
                      <CardDescription>
                        {t(doc.descriptionKey)}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t("lastUpdated", { date: doc.lastUpdated })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 p-6 border rounded-lg bg-muted/50">
        <div className="flex gap-3 items-start">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">
              {t("futureDocuments.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("futureDocuments.description")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          {t("contact.text")}{" "}
          <a
            href="mailto:me@aiken.si"
            className="text-primary hover:underline"
          >
            {t("contact.link")}
          </a>
        </p>
      </div>
    </div>
  );
}
