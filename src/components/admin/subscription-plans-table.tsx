"use client";

import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { SquarePen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/admin/data-table/data-table";
import { DataTableRowActions } from "@/components/admin/data-table/data-table-row-actions";
import type { DataTableFeatures } from "@/components/admin/data-table/features";
import { EditPlanDialog } from "./edit-plan-dialog";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  isActive: boolean;
  isInternal: boolean;
  lemonSqueezyVariantId: string | null;
  lemonSqueezyProductId: string | null;
  sortOrder: number;
}

const columnHelper = createColumnHelper<DataTableFeatures, Plan>();

// A handful of plans: one page, no paging or sorting (they keep sortOrder)
export function SubscriptionPlansTable({ plans }: { plans: Plan[] }) {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const columns = columnHelper.columns([
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    }),
    columnHelper.accessor("price", {
      header: "Price",
      cell: ({ row }) =>
        row.original.price === 0 ? "Free" : `€${(row.original.price / 100).toFixed(2)}`,
    }),
    columnHelper.accessor("interval", {
      header: "Interval",
      meta: { className: "capitalize" },
    }),
    columnHelper.accessor("isActive", {
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "default" : "secondary"}>
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    }),
    columnHelper.accessor("isInternal", {
      header: "Visibility",
      cell: ({ row }) => (
        <Badge variant={row.original.isInternal ? "outline" : "default"}>
          {row.original.isInternal ? "Internal" : "Public"}
        </Badge>
      ),
    }),
    columnHelper.accessor("lemonSqueezyVariantId", {
      header: "Variant ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.lemonSqueezyVariantId || "—"}</span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions>
          <DropdownMenuItem onClick={() => setEditingPlan(row.original)}>
            <SquarePen />
            Edit plan
          </DropdownMenuItem>
        </DataTableRowActions>
      ),
      meta: { className: "w-12" },
    }),
  ]);

  return (
    <>
      <DataTable
        columns={columns}
        data={plans}
        getRowId={(plan) => plan.id}
        emptyMessage="No plans yet"
      />

      {editingPlan && (
        <EditPlanDialog
          plan={editingPlan}
          open
          onOpenChange={(open) => !open && setEditingPlan(null)}
        />
      )}
    </>
  );
}
