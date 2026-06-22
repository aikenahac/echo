"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSubscriptionPlan } from "@/app/[locale]/actions/admin";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/routing";

export function CreatePlanDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    paddlePriceId: "",
    paddleProductId: "",
    price: 0,
    interval: "month" as "month" | "year" | "lifetime" | "free",
    sortOrder: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createSubscriptionPlan({
        name: formData.name,
        paddlePriceId: formData.paddlePriceId || null,
        paddleProductId: formData.paddleProductId || null,
        price: Math.round(formData.price * 100), // Convert to cents
        interval: formData.interval,
        isActive: true,
        sortOrder: formData.sortOrder,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plan created successfully");
        setOpen(false);
        // Reset form
          setFormData({
          name: "",
          paddlePriceId: "",
          paddleProductId: "",
          price: 0,
          interval: "month",
          sortOrder: 10,
        });
        router.refresh();
      }
    } catch (error) {
      toast.error("Failed to create plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Subscription Plan</DialogTitle>
            <DialogDescription>
              Add a new subscription plan. Enter the Paddle Price ID from your
              Paddle Dashboard.
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
                placeholder="Premium Yearly"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (EUR)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  placeholder="19.99"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interval">Interval</Label>
                <Select
                  value={formData.interval}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, interval: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  setFormData({
                    ...formData,
                    paddleProductId: e.target.value,
                  })
                }
                placeholder="pro_..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sortOrder: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
