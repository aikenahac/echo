import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Link } from "@/i18n/routing";
import { Book, Users, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");
  const tNav = useTranslations("navigation");

  return (
    <div className="container mx-auto px-4 py-16">
      <SignedOut>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl font-bold mb-4">{t("welcome")}</h1>
          <p className="text-xl text-muted-foreground mb-8">{t("tagline")}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="p-6 border rounded-lg">
              <Book className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">
                {t("features.track.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("features.track.description")}
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">
                {t("features.connect.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("features.connect.description")}
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">
                {t("features.achieve.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("features.achieve.description")}
              </p>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">{t("welcomeBack")}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/library"
              className="p-8 border rounded-lg hover:border-primary transition-colors"
            >
              <Book className="h-10 w-10 mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">
                {t("quickLinks.library.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("quickLinks.library.description")}
              </p>
            </Link>
            <Link
              href="/books/search"
              className="p-8 border rounded-lg hover:border-primary transition-colors"
            >
              <Book className="h-10 w-10 mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">
                {t("quickLinks.search.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("quickLinks.search.description")}
              </p>
            </Link>
            <Link
              href="/feed"
              className="p-8 border rounded-lg hover:border-primary transition-colors"
            >
              <TrendingUp className="h-10 w-10 mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">
                {t("quickLinks.feed.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("quickLinks.feed.description")}
              </p>
            </Link>
            <Link
              href="/profile"
              className="p-8 border rounded-lg hover:border-primary transition-colors"
            >
              <Users className="h-10 w-10 mb-4 text-primary" />
              <h2 className="text-2xl font-semibold mb-2">
                {t("quickLinks.profile.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("quickLinks.profile.description")}
              </p>
            </Link>
          </div>
        </div>
      </SignedIn>
    </div>
  );
}
