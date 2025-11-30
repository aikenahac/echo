"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { EditPlanDialog } from "./edit-plan-dialog";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string | null;
  isActive: boolean;
  isInternal: boolean;
  stripePriceId: string | null;
  stripeProductId: string | null;
  sortOrder: number;
}

export function SubscriptionPlansTable({ plans }: { plans: Plan[] }) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Interval</TableHead>
              <TableHead>Features</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Stripe Price ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
              const features = plan.features
                ? JSON.parse(plan.features)
                : {};
              return (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>
                    {plan.price === 0
                      ? "Free"
                      : `€${(plan.price / 100).toFixed(2)}`}
                  </TableCell>
                  <TableCell className="capitalize">{plan.interval}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {features.maxBooksPerYear ? (
                        <span>{features.maxBooksPerYear} books/year</span>
                      ) : (
                        <span>Unlimited</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isInternal ? "outline" : "default"}>
                      {plan.isInternal ? "Internal" : "Public"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {plan.stripePriceId || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPlan(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editingPlan && (
        <EditPlanDialog
          plan={editingPlan}
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
        />
      )}
    </>
  );
}
