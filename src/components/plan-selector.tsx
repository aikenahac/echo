"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/app/[locale]/actions/subscriptions";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string | null;
  isActive: boolean;
}

export function PlanSelector({
  plans,
  currentPlanId,
}: {
  plans: Plan[];
  currentPlanId: string | undefined;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setLoading(planId);
    try {
      const result = await createCheckoutSession(planId);

      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast.error("Failed to start checkout");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const features = plan.features ? JSON.parse(plan.features) : {};
        const isCurrent = plan.id === currentPlanId;
        const isFree = plan.interval === "free";

        return (
          <Card
            key={plan.id}
            className={isCurrent ? "border-primary border-2" : ""}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{plan.name}</CardTitle>
                {isCurrent && (
                  <span className="text-sm text-primary font-medium">
                    Current Plan
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  €{(plan.price / 100).toFixed(2)}
                  <span className="text-sm text-muted-foreground font-normal">
                    /{plan.interval}
                  </span>
                </p>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  {features.maxBooksPerYear
                    ? `${features.maxBooksPerYear} books per year`
                    : "Unlimited books"}
                </li>
                {features.earlyAccess && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    Early access to new features
                  </li>
                )}
                {features.prioritySupport && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    Priority support
                  </li>
                )}
              </ul>

              {!isCurrent && !isFree && (
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upgrade to This Plan"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
