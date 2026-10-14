"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-[31px] w-[51px] flex-none cursor-pointer items-center rounded-full bg-rule transition-colors data-[state=checked]:bg-pink-ink disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-[27px] translate-x-[2px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.18)] transition-transform data-[state=checked]:translate-x-[22px]" />
    </SwitchPrimitive.Root>
  );
}
