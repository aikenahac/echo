"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex h-9 rounded-full bg-tint p-0.5", className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 cursor-pointer rounded-full text-[15px] font-semibold transition-colors",
              on
                ? "bg-paper text-ink shadow-[0_1px_3px_rgba(23,11,17,.12)] dark:bg-[#3a2630]"
                : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
