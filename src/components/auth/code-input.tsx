"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Six code boxes backed by one real input, so paste and one-time-code autofill
 * work. Digits are set in Archivo with the pink plate offset.
 */
export function CodeInput({
  value,
  onChange,
  label,
  error,
  autoFocus,
  onComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  error?: string | null;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");
  const active = Math.min(value.length, 5);

  return (
    <div>
      <div className="relative" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          aria-label={label}
          aria-invalid={!!error}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          autoFocus={autoFocus}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 6);
            onChange(next);
            if (next.length === 6) onComplete?.(next);
          }}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
        />
        <div className="grid grid-cols-6 gap-2" aria-hidden>
          {digits.map((d, i) => {
            const isActive = focused && i === active;
            return (
              <div
                key={i}
                className={cn(
                  "grid h-16 place-items-center rounded-xl border bg-input-bg md:h-[72px]",
                  error ? "border-negative" : isActive ? "border-ink" : "border-rule",
                  isActive && "border-[1.5px]",
                )}
              >
                {d.trim() ? (
                  <span className="font-disp plate-sm tnum text-[36px] leading-none">
                    {d}
                  </span>
                ) : isActive ? (
                  <span className="h-8 w-[2px] animate-pulse bg-pink-ink" />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[13px] text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
