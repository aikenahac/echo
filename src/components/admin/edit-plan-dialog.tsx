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
  isActive: boolean;
  isInternal: boolean;
  paddlePriceId: string | null;
  paddleProductId: string | null;
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
    paddlePriceId: plan.paddlePriceId || "",
    paddleProductId: plan.paddleProductId || "",
    isActive: plan.isActive,
    isInternal: plan.isInternal,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateSubscriptionPlan(plan.id, {
        name: formData.name,
        price: Math.round(formData.price * 100), // Convert to cents
        paddlePriceId: formData.paddlePriceId || null,
        paddleProductId: formData.paddleProductId || null,
        isActive: formData.isActive,
        isInternal: formData.isInternal,
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
              <Label htmlFor="paddlePriceId">Paddle Price ID</Label>
              <Input
                id="paddlePriceId"
                value={formData.paddlePriceId}
                onChange={(e) =>
                  setFormData({ ...formData, paddlePriceId: e.target.value })
                }
                placeholder="pri_..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for free tier
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paddleProductId">Paddle Product ID</Label>
              <Input
                id="paddleProductId"
                value={formData.paddleProductId}
                onChange={(e) =>
                  setFormData({ ...formData, paddleProductId: e.target.value })
                }
                placeholder="pro_..."
                className="font-mono text-sm"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive plans cannot be purchased
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isInternal">Internal Only</Label>
                <p className="text-xs text-muted-foreground">
                  Internal plans are not shown on the subscription page
                </p>
              </div>
              <Switch
                id="isInternal"
                checked={formData.isInternal}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isInternal: checked })
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
