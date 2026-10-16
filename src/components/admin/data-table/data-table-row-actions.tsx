"use client";

import type { ReactNode } from "react";
import { LoaderCircle, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The `⋯` menu every admin row uses for its actions. */
export function DataTableRowActions({
  children,
  busy = false,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <div className="flex justify-end">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" disabled={busy}>
            <span className="sr-only">Open menu</span>
            {busy ? <LoaderCircle className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
