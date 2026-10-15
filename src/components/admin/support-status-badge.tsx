import { Badge } from "@/components/ui/badge";
import type { SupportStatus } from "@/lib/support";

const LABELS: Record<SupportStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const VARIANTS = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
} as const satisfies Record<SupportStatus, "default" | "secondary" | "outline">;

export function supportStatusLabel(status: SupportStatus) {
  return LABELS[status];
}

export function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
