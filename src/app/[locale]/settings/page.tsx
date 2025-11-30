import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/routing";
import { db } from "@/db";
import { users, userSubscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function SettingsPage({ params }: { params: { locale: string } }) {
  const { userId } = await auth();
  if (!userId) {
    redirect({ href: "/", locale: params.locale });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId!),
  });

  const subscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.userId, userId!),
    with: { plan: true },
  });

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">
        Manage your account settings and preferences
      </p>

      <div className="space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-base">{user?.email || "Not available"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Username</label>
              <p className="text-base">{user?.username || "Not set"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Information */}
        {subscription && (
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Plan</label>
                  <p className="text-2xl font-bold">{subscription.plan.name}</p>
                </div>
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Price</label>
                <p className="text-base">
                  {subscription.plan.price === 0 ? (
                    "Free"
                  ) : (
                    <>
                      €{(subscription.plan.price / 100).toFixed(2)}
                      <span className="text-sm text-muted-foreground">
                        /{subscription.plan.interval === "lifetime" ? "lifetime" : subscription.plan.interval}
                      </span>
                    </>
                  )}
                </p>
              </div>

              {subscription.plan.interval !== "lifetime" && subscription.currentPeriodEnd && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ? "Expires" : "Renews"}
                  </label>
                  <p className="text-base">
                    {format(new Date(subscription.currentPeriodEnd), "MMMM d, yyyy")}
                  </p>
                </div>
              )}

              {subscription.plan.interval === "lifetime" && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    🎉 You have lifetime access! No renewal required.
                  </p>
                </div>
              )}

              {subscription.plan.features && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Features</label>
                  <div className="mt-2">
                    {(() => {
                      const features = JSON.parse(subscription.plan.features);
                      return (
                        <ul className="space-y-1 text-sm">
                          <li>
                            {features.maxBooksPerYear
                              ? `${features.maxBooksPerYear} books per year`
                              : "Unlimited books"}
                          </li>
                          {features.earlyAccess && <li>Early access to new features</li>}
                          {features.prioritySupport && <li>Priority support</li>}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
