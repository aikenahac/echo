"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { setPromoCodeActive } from "@/app/[locale]/actions/promo-admin";

type PromoCodeRow = {
  id: string;
  code: string;
  durationUnit: "month" | "year" | "lifetime";
  durationCount: number | null;
  maxUses: number | null;
  redeemedCount: number;
  isActive: boolean;
  note: string | null;
  createdAt: Date;
  plan: { id: string; name: string };
};

function formatDuration(unit: PromoCodeRow["durationUnit"], count: number | null) {
  if (unit === "lifetime") return "Lifetime";
  const n = count ?? 1;
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export function PromoCodesTable({ codes }: { codes: PromoCodeRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const toggle = async (id: string, isActive: boolean) => {
    setPending(id);
    const result = await setPromoCodeActive(id, isActive);
    setPending(null);
    if (result.error) toast.error(result.error);
    else router.refresh();
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/redeem?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Redeem link copied"),
      () => toast.error("Couldn't copy the link"),
    );
  };

  if (codes.length === 0) {
    return (
      <div className="rounded-md border p-6 text-center text-muted-foreground">
        No promo codes yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Uses</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map((c) => {
            const usedUp = c.maxUses !== null && c.redeemedCount >= c.maxUses;
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{c.code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyLink(c.code)}
                      aria-label="Copy redeem link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{c.plan.name}</TableCell>
                <TableCell>{formatDuration(c.durationUnit, c.durationCount)}</TableCell>
                <TableCell className="tabular-nums">
                  {c.redeemedCount} / {c.maxUses ?? "∞"}
                  {usedUp && (
                    <Badge variant="secondary" className="ml-2">
                      Used up
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-muted-foreground">
                  {c.note}
                </TableCell>
                <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Switch
                    checked={c.isActive}
                    disabled={pending === c.id}
                    onCheckedChange={(checked) => toggle(c.id, checked)}
                    aria-label={c.isActive ? "Disable code" : "Enable code"}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
