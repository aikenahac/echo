"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  grantPremiumSubscription,
  revokeUserSubscription,
} from "@/app/[locale]/actions/admin";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import { format } from "date-fns";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string | null;
  plan: Plan;
}

interface User {
  id: string;
  email: string;
  username: string | null;
  isPremium: boolean;
  subscription?: Subscription | null;
}

export function ManageUserSubscriptionDialog({
  user,
  plans,
  open,
  onOpenChange,
}: {
  user: User;
  plans: Plan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(
    user.subscription?.plan.id || ""
  );

  const handleGrantSubscription = async () => {
    if (!selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }

    setLoading(true);
    try {
      const result = await grantPremiumSubscription(user.id, selectedPlanId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subscription updated successfully");
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to update subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSubscription = async () => {
    if (
      !confirm(
        `Are you sure you want to revoke ${user.email}'s premium subscription? They will be downgraded to the free tier.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const result = await revokeUserSubscription(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Subscription revoked successfully");
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to revoke subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <DialogDescription>
            Manage subscription for {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Subscription Info */}
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div className="flex items-center gap-2">
              <Badge variant={user.isPremium ? "default" : "secondary"}>
                {user.isPremium ? "Premium" : "Free"}
              </Badge>
              {user.subscription && (
                <Badge variant="outline">{user.subscription.status}</Badge>
              )}
            </div>
          </div>

          {user.subscription && (
            <>
              <div className="space-y-2">
                <Label>Current Plan</Label>
                <div className="text-sm">
                  <p className="font-medium">{user.subscription.plan.name}</p>
                  <p className="text-muted-foreground">
                    €{(user.subscription.plan.price / 100).toFixed(2)} /{" "}
                    {user.subscription.plan.interval}
                  </p>
                </div>
              </div>

              {user.subscription.currentPeriodStart && (
                <div className="space-y-2">
                  <Label>Period</Label>
                  <div className="text-sm text-muted-foreground">
                    {format(
                      new Date(user.subscription.currentPeriodStart),
                      "MMM d, yyyy"
                    )}{" "}
                    -{" "}
                    {user.subscription.currentPeriodEnd
                      ? format(
                          new Date(user.subscription.currentPeriodEnd),
                          "MMM d, yyyy"
                        )
                      : "No end date"}
                  </div>
                </div>
              )}

              {user.subscription.stripeSubscriptionId && (
                <div className="space-y-2">
                  <Label>Stripe Subscription ID</Label>
                  <div className="text-sm font-mono text-muted-foreground break-all">
                    {user.subscription.stripeSubscriptionId}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Change Plan */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="plan">Change Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger id="plan">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - €{(plan.price / 100).toFixed(2)} /{" "}
                    {plan.interval}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Manual grants do not expire and are not tied to Stripe
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {user.isPremium && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRevokeSubscription}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Revoke Subscription
            </Button>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleGrantSubscription}
              disabled={loading || !selectedPlanId}
              className="flex-1 sm:flex-none"
            >
              {loading ? "Updating..." : "Update Plan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
