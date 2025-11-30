import { Check, Crown, Sparkles, BookOpen, Users, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Pricing - Echo Reads",
  description: "Choose the perfect plan for your reading journey. Start free or upgrade to Premium for unlimited books and custom collections.",
};

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("pricing");

  // Check if user is authenticated
  const { userId } = await auth();

  // If user is logged in, redirect to subscription page
  if (userId) {
    redirect({ href: "/subscription", locale });
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t("subtitle")}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="relative border-2">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-2xl">{t("free.name")}</CardTitle>
              </div>
              <CardDescription>{t("free.tagline")}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{t("free.price")}</span>
                <span className="text-muted-foreground ml-2">{t("free.period")}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{t("free.features.books")}</strong>
                    <p className="text-sm text-muted-foreground">{t("free.features.booksDesc")}</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{t("free.features.stats")}</strong>
                    <p className="text-sm text-muted-foreground">{t("free.features.statsDesc")}</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{t("free.features.reviews")}</strong>
                    <p className="text-sm text-muted-foreground">{t("free.features.reviewsDesc")}</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>{t("free.features.social")}</strong>
                    <p className="text-sm text-muted-foreground">{t("free.features.socialDesc")}</p>
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline" size="lg">
                <Link href="/sign-up">{t("free.cta")}</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-primary shadow-lg shadow-primary/20">
            {/* Premium Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Crown className="h-4 w-4" />
                {t("premium.badge")}
              </div>
            </div>

            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">{t("premium.name")}</CardTitle>
              </div>
              <CardDescription>{t("premium.tagline")}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{t("premium.price")}</span>
                <span className="text-muted-foreground ml-2">{t("premium.period")}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t("premium.lifetime")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {t("premium.includes")}
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">{t("premium.features.unlimited")}</strong>
                    <p className="text-sm text-muted-foreground">{t("premium.features.unlimitedDesc")}</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">{t("premium.features.collections")}</strong>
                    <p className="text-sm text-muted-foreground">{t("premium.features.collectionsDesc")}</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">{t("premium.features.support")}</strong>
                    <p className="text-sm text-muted-foreground">{t("premium.features.supportDesc")}</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">{t("premium.features.earlyAccess")}</strong>
                    <p className="text-sm text-muted-foreground">{t("premium.features.earlyAccessDesc")}</p>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">{t("comparison.title")}</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">{t("comparison.feature")}</th>
                      <th className="text-center p-4 font-semibold">{t("comparison.free")}</th>
                      <th className="text-center p-4 font-semibold bg-primary/5">
                        <div className="flex items-center justify-center gap-2">
                          <Crown className="h-4 w-4 text-primary" />
                          {t("comparison.premium")}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4">{t("comparison.booksPerYear")}</td>
                      <td className="text-center p-4">50</td>
                      <td className="text-center p-4 bg-primary/5 font-semibold text-primary">{t("comparison.unlimited")}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">{t("comparison.progress")}</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">{t("comparison.reviews")}</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">{t("comparison.social")}</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 flex items-center gap-2">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        {t("comparison.collections")}
                      </td>
                      <td className="text-center p-4 text-muted-foreground">-</td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {t("comparison.support")}
                      </td>
                      <td className="text-center p-4 text-muted-foreground">-</td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr>
                      <td className="p-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        {t("comparison.earlyAccess")}
                      </td>
                      <td className="text-center p-4 text-muted-foreground">-</td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">{t("faq.title")}</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("faq.upgrade.question")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("faq.upgrade.answer")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("faq.limit.question")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("faq.limit.answer")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("faq.refunds.question")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("faq.refunds.answer")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("faq.payment.question")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t("faq.payment.answer")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
