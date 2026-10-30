"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPromoCode } from "@/app/[locale]/actions/promo-admin";

type DurationUnit = "month" | "year" | "lifetime";

const initialForm = (planId: string) => ({
  code: "",
  planId,
  durationUnit: "month" as DurationUnit,
  durationCount: 1,
  unlimited: false,
  maxUses: 1,
  note: "",
});

export function CreatePromoCodeDialog({
  plans,
}: {
  plans: { id: string; name: string; isInternal: boolean }[];
}) {
  const router = useRouter();
  const defaultPlan = (plans.find((p) => p.isInternal) ?? plans[0])?.id ?? "";
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => initialForm(defaultPlan));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await createPromoCode({
        code: form.code || undefined,
        planId: form.planId,
        durationUnit: form.durationUnit,
        durationCount: form.durationUnit === "lifetime" ? null : form.durationCount,
        maxUses: form.unlimited ? null : form.maxUses,
        note: form.note || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Created ${result.code}`);
        setOpen(false);
        setForm(initialForm(defaultPlan));
        router.refresh();
      }
    } catch {
      toast.error("Failed to create promo code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={plans.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Create Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Redeeming the code grants the plan for free for the chosen time.
              Leave the code blank to generate one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Generated if blank"
                className="font-mono uppercase"
                maxLength={32}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Select value={form.planId} onValueChange={(planId) => setForm({ ...form, planId })}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.isInternal ? " (internal)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="durationUnit">Duration</Label>
                <Select
                  value={form.durationUnit}
                  onValueChange={(value) => setForm({ ...form, durationUnit: value as DurationUnit })}
                >
                  <SelectTrigger id="durationUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Months</SelectItem>
                    <SelectItem value="year">Years</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.durationUnit !== "lifetime" && (
                <div className="space-y-2">
                  <Label htmlFor="durationCount">
                    Number of {form.durationUnit === "month" ? "months" : "years"}
                  </Label>
                  <Input
                    id="durationCount"
                    type="number"
                    min={1}
                    max={120}
                    value={form.durationCount}
                    onChange={(e) => setForm({ ...form, durationCount: e.target.valueAsNumber })}
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="unlimited">Unlimited uses</Label>
              <Switch
                id="unlimited"
                checked={form.unlimited}
                onCheckedChange={(unlimited) => setForm({ ...form, unlimited })}
              />
            </div>
            {!form.unlimited && (
              <div className="space-y-2">
                <Label htmlFor="maxUses">Max uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min={1}
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.valueAsNumber })}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="e.g. Book club giveaway"
                maxLength={200}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !form.planId}>
              {loading ? "Creating..." : "Create Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
