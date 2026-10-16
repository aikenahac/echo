"use client";

import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";

/**
 * Sparkle shown after a system administrator's name; hover or focus explains it.
 * Pass focusable={false} inside another control so it adds no tab stop.
 */
export function AdminBadge({
  size = 14,
  focusable = true,
  className,
}: {
  size?: number;
  focusable?: boolean;
  className?: string;
}) {
  const t = useTranslations("badges");
  const label = t("systemAdmin");
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={focusable ? 0 : undefined}
            role="img"
            aria-label={label}
            className={cn(
              "inline-flex flex-none cursor-default align-middle outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
              className,
            )}
          >
            <Icon name="sparkle" size={size} strokeWidth={2} />
          </span>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
