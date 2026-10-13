"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/**
 * A bottom sheet on phones (grab handle, 40px corners) and a centred panel on
 * wider screens. `tone="field"` makes it a pink page (paywall, first run).
 */
export function SheetContent({
  children,
  className,
  title,
  description,
  hideTitle,
  tone = "paper",
  size = "md",
  dismissible = true,
  onDone,
  doneDisabled,
  doneLabel = "Done",
  closeLabel = "Close",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  hideTitle?: boolean;
  tone?: "paper" | "field";
  size?: "md" | "lg" | "full";
  dismissible?: boolean;
  /** Shows the ✓ toolbar button (editor sheets). */
  onDone?: () => void;
  doneDisabled?: boolean;
  doneLabel?: string;
  closeLabel?: string;
}) {
  const editor = !!onDone;
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-[rgba(23,11,17,.32)] backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        onInteractOutside={dismissible ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={dismissible ? undefined : (e) => e.preventDefault()}
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          // phone: bottom sheet
          "inset-x-2 bottom-2 max-h-[calc(100dvh-24px)] rounded-[32px] data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:slide-in-from-bottom-8",
          // wider: centred panel
          "md:inset-x-auto md:bottom-auto md:top-1/2 md:left-1/2 md:max-h-[min(860px,calc(100dvh-64px))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px] md:data-[state=closed]:slide-out-to-bottom-2 md:data-[state=open]:slide-in-from-bottom-2",
          size === "md" && "md:w-[460px]",
          size === "lg" && "md:w-[560px]",
          size === "full" &&
            "inset-0 bottom-0 max-h-none rounded-none md:h-[min(780px,calc(100dvh-64px))] md:w-[520px] md:rounded-[28px]",
          tone === "field" ? "on-field bg-field" : "bg-paper text-ink",
          "shadow-[0_-10px_40px_rgba(23,11,17,.2)]",
          className,
        )}
        {...props}
      >
        {size !== "full" && (
          <div
            aria-hidden
            className="mx-auto mt-2.5 h-[5px] w-9 flex-none rounded-full bg-rule md:hidden"
          />
        )}
        {editor ? (
          <div className="grid flex-none grid-cols-[44px_1fr_44px] items-center px-3 pt-2 pb-1 md:pt-4">
            <DialogPrimitive.Close
              aria-label={closeLabel}
              className="grid size-11 cursor-pointer place-items-center rounded-full bg-tint text-ink"
            >
              <Icon name="close" size={18} />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="truncate text-center text-[17px] font-semibold">
              {title}
            </DialogPrimitive.Title>
            <button
              type="button"
              onClick={onDone}
              disabled={doneDisabled}
              aria-label={doneLabel}
              className="grid size-11 cursor-pointer place-items-center rounded-full bg-ink text-paper disabled:opacity-40"
            >
              <Icon name="check" size={20} strokeWidth={2.2} />
            </button>
          </div>
        ) : (
          <DialogPrimitive.Title
            className={cn(
              "font-disp px-5 pt-3 text-[28px] leading-none md:px-7 md:pt-7",
              hideTitle && "sr-only",
            )}
          >
            {title}
          </DialogPrimitive.Title>
        )}
        {description ? (
          <DialogPrimitive.Description
            className={cn(
              "px-5 pt-1.5 text-[13px] text-ink-2 md:px-7",
              editor && "text-center",
            )}
          >
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">
            {typeof title === "string" ? title : ""}
          </DialogPrimitive.Description>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-8 md:px-7 md:pb-7">
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
