"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { createPaddleCheckout, upgradeToFreePlan } from "@/app/[locale]/actions/subscriptions";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  isActive: boolean;
  paddlePriceId: string | null;
}

export function PlanSelector({
  plans,
  currentPlanId,
}: {
  plans: Plan[];
  currentPlanId: string | undefined;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planId: string, isFree: boolean) => {
    setLoading(planId);
    try {
      if (isFree) {
        // Direct upgrade to free plan
        const result = await upgradeToFreePlan(planId);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Successfully upgraded to the plan!");
          window.location.reload();
        }
      } else {
        // Paddle checkout for paid plans
        const result = await createPaddleCheckout(planId);
        if (result.error) {
          toast.error(result.error);
        } else if (result.transactionId) {
          // Open Paddle checkout overlay
          if (typeof window !== "undefined" && (window as any).Paddle) {
            (window as any).Paddle.Checkout.open({
              transactionId: result.transactionId,
            });
          } else {
            toast.error("Payment system not loaded. Please refresh and try again.");
          }
        }
      }
    } catch {
      toast.error("Failed to upgrade plan");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId;
        const isFree = !plan.paddlePriceId; // Free plans don't have Paddle price ID

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
                  {plan.price === 0 ? (
                    "Free"
                  ) : (
                    <>
                      €{(plan.price / 100).toFixed(2)}
                      <span className="text-sm text-muted-foreground font-normal">
                        /{plan.interval}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Unlimited books</span>
                </li>
                {!isFree && (
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="font-semibold">Custom collections</span>
                  </li>
                )}
              </ul>

              {!isCurrent && (
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade(plan.id, isFree)}
                  disabled={loading === plan.id}
                  variant={isFree ? "default" : "default"}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isFree ? (
                    "Claim This Plan"
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
