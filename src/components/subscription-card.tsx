"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cancelSubscription } from "@/app/[locale]/actions/subscriptions";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Subscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  paddleSubscriptionId: string | null;
  plan: {
    id: string;
    name: string;
    price: number;
    interval: string;
  };
}

export function SubscriptionCard({
  subscription,
}: {
  subscription: Subscription | undefined | null;
}) {
  const [loading, setLoading] = useState(false);

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      const result = await cancelSubscription();
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success("Subscription will cancel at period end");
        window.location.reload();
      }
    } catch (error) {
      toast.error("Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  if (!subscription) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No active subscription</p>
        </CardContent>
      </Card>
    );
  }

  const { plan, status, currentPeriodEnd, cancelAtPeriodEnd } = subscription;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          <Badge variant={status === "active" ? "default" : "secondary"}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-bold">
            {plan.price === 0 ? (
              "Free"
            ) : (
              <>
                €{(plan.price / 100).toFixed(2)}
                <span className="text-sm text-muted-foreground font-normal">
                  /{plan.interval === "lifetime" ? "lifetime" : plan.interval}
                </span>
              </>
            )}
          </p>
        </div>

        {currentPeriodEnd && plan.interval !== "lifetime" && (
          <div className="text-sm">
            <p className="text-muted-foreground">
              {cancelAtPeriodEnd ? "Expires" : "Renews"} on{" "}
              {format(new Date(currentPeriodEnd), "MMMM d, yyyy")}
            </p>
          </div>
        )}

        {subscription.paddleSubscriptionId && !cancelAtPeriodEnd && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCancelSubscription}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Cancel Subscription"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
