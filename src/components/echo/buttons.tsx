import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const capsule = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.3px] whitespace-nowrap transition-[background-color,opacity,transform] select-none active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        // ink fill on paper
        ink: "bg-ink text-paper hover:opacity-90",
        // primary on the pink field (ink in light, pink-ink fill in dark)
        field: "bg-[var(--field-button)] text-[var(--field-button-ink)] hover:opacity-90",
        outline: "border border-ink text-ink hover:bg-tint",
        quiet: "border border-rule text-ink hover:bg-tint",
        paper: "bg-paper text-ink hover:opacity-90",
        ghost: "text-ink hover:bg-tint",
        link: "h-auto px-0 text-pink-ink hover:underline underline-offset-4",
        negative: "text-negative hover:bg-tint",
      },
      size: {
        lg: "h-14 px-6 text-[17px]",
        md: "h-[52px] px-5 text-[17px]",
        sm: "h-11 px-4 text-[15px]",
        xs: "h-8 px-3 text-[13px] gap-1",
      },
    },
    defaultVariants: { variant: "ink", size: "md" },
  },
);

export function Capsule({
  className,
  variant,
  size,
  asChild,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof capsule> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(capsule({ variant, size }), className)} {...props} />
  );
}

/** 44px round glass button for toolbars. */
export function IconButton({
  className,
  label,
  asChild,
  plain,
  ...props
}: React.ComponentProps<"button"> & {
  label: string;
  asChild?: boolean;
  /** No glass, just the hit area. */
  plain?: boolean;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      aria-label={label}
      title={label}
      className={cn(
        "grid size-11 flex-none cursor-pointer place-items-center rounded-full text-ink transition-colors",
        plain ? "hover:bg-tint" : "glass hover:brightness-[.97]",
        className,
      )}
      {...props}
    />
  );
}

/** A glass capsule holding several icon buttons (detail toolbar). */
export function ToolbarGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass flex h-11 items-center gap-1 rounded-full px-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ToolbarButton({
  className,
  label,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 cursor-pointer place-items-center rounded-full text-ink hover:bg-tint/70",
        className,
      )}
      {...props}
    />
  );
}
