import { Check, Crown, Sparkles, BookOpen, Users, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/routing";

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
          <h1 className="text-5xl font-bold mb-4 bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade anytime. All premium plans include the same features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="relative border-2">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-2xl">Free</CardTitle>
              </div>
              <CardDescription>Perfect for casual readers</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€0</span>
                <span className="text-muted-foreground ml-2">forever</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>50 books per year</strong>
                    <p className="text-sm text-muted-foreground">Track your reading progress</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Reading stats & progress</strong>
                    <p className="text-sm text-muted-foreground">Monitor your reading habits</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Book reviews</strong>
                    <p className="text-sm text-muted-foreground">Share your thoughts</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Follow other readers</strong>
                    <p className="text-sm text-muted-foreground">Connect with the community</p>
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline" size="lg">
                <Link href="/sign-up">Get Started Free</Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-primary shadow-lg shadow-primary/20">
            {/* Premium Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                <Crown className="h-4 w-4" />
                Most Popular
              </div>
            </div>

            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-2xl">Echo Premium</CardTitle>
              </div>
              <CardDescription>For passionate readers</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">€1.99</span>
                <span className="text-muted-foreground ml-2">/ month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                or €19.99 for life
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Everything in Free, plus:
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">Unlimited books</strong>
                    <p className="text-sm text-muted-foreground">No yearly limits on your library</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">Custom collections</strong>
                    <p className="text-sm text-muted-foreground">Organize books by theme, genre, or mood</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">Priority support</strong>
                    <p className="text-sm text-muted-foreground">Get help faster when you need it</p>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary">Early access</strong>
                    <p className="text-sm text-muted-foreground">Be first to try new features</p>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Feature Comparison</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">Free</th>
                      <th className="text-center p-4 font-semibold bg-primary/5">
                        <div className="flex items-center justify-center gap-2">
                          <Crown className="h-4 w-4 text-primary" />
                          Premium
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-4">Books per year</td>
                      <td className="text-center p-4">50</td>
                      <td className="text-center p-4 bg-primary/5 font-semibold text-primary">Unlimited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Reading progress tracking</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Book reviews</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4">Social features (follow users)</td>
                      <td className="text-center p-4"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 flex items-center gap-2">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        Custom collections
                      </td>
                      <td className="text-center p-4 text-muted-foreground">-</td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-4 flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Priority support
                      </td>
                      <td className="text-center p-4 text-muted-foreground">-</td>
                      <td className="text-center p-4 bg-primary/5"><Check className="h-5 w-5 mx-auto text-primary" /></td>
                    </tr>
                    <tr>
                      <td className="p-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        Early access to features
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
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I upgrade or downgrade anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes! You can upgrade to Premium at any time. If you downgrade, you&apos;ll keep Premium features until the end of your billing period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens if I reach the 50 book limit on Free?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You&apos;ll receive notifications as you approach the limit. Once reached, you can upgrade to Premium for unlimited books or wait until next year when your limit resets.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We offer a 14-day money-back guarantee on all Premium plans. If you&apos;re not satisfied, contact our support team for a full refund.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
