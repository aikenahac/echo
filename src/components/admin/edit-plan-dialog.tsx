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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateSubscriptionPlan } from "@/app/[locale]/actions/admin";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string | null;
  isActive: boolean;
  stripePriceId: string | null;
  stripeProductId: string | null;
  sortOrder: number;
}

export function EditPlanDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: plan.name,
    price: plan.price / 100, // Convert cents to dollars
    stripePriceId: plan.stripePriceId || "",
    stripeProductId: plan.stripeProductId || "",
    features: plan.features || "{}",
    isActive: plan.isActive,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateSubscriptionPlan(plan.id, {
        name: formData.name,
        price: Math.round(formData.price * 100), // Convert to cents
        stripePriceId: formData.stripePriceId || null,
        stripeProductId: formData.stripeProductId || null,
        features: formData.features,
        isActive: formData.isActive,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plan updated successfully");
        onOpenChange(false);
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to update plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription>
              Update plan details and features
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (EUR)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: parseFloat(e.target.value) })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripePriceId">Stripe Price ID</Label>
              <Input
                id="stripePriceId"
                value={formData.stripePriceId}
                onChange={(e) =>
                  setFormData({ ...formData, stripePriceId: e.target.value })
                }
                placeholder="price_..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for free tier
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripeProductId">Stripe Product ID</Label>
              <Input
                id="stripeProductId"
                value={formData.stripeProductId}
                onChange={(e) =>
                  setFormData({ ...formData, stripeProductId: e.target.value })
                }
                placeholder="prod_..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="features">Features (JSON)</Label>
              <textarea
                id="features"
                className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
                value={formData.features}
                onChange={(e) =>
                  setFormData({ ...formData, features: e.target.value })
                }
                placeholder='{"maxBooksPerYear": null}'
              />
              <p className="text-xs text-muted-foreground">
                Use null for unlimited books. Example: {`{"maxBooksPerYear": 50}`}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
