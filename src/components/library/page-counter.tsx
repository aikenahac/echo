"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const PX_PER_PAGE = 9;

/** One wheel of the numbering machine: a 0–9 strip rolled to `digit`. */
function Wheel({ digit }: { digit: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden pr-[3px] pb-[3px] [box-sizing:content-box] -mr-[3px]">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-300 ease-[cubic-bezier(.3,1.25,.5,1)] motion-reduce:transition-none"
        style={{ transform: `translateY(-${digit}em)` }}
      >
        {DIGITS.map((d) => (
          <span key={d} className="block h-[1em] text-center leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * The page number as a numbering stamp: one rolling wheel per digit. Drag it
 * up or down, scroll on it, or use the arrow keys; a click without a drag
 * calls `onActivate` (opens the page editor).
 */
export function PageCounter({
  value,
  max,
  onChange,
  onActivate,
  label,
  hint,
  className,
}: {
  value: number;
  max: number | null;
  onChange: (value: number) => void;
  onActivate?: () => void;
  label: string;
  hint?: string;
  className?: string;
}) {
  const drag = useRef<{ y: number; start: number; moved: boolean } | null>(
    null,
  );
  const wheelAcc = useRef(0);

  const clamp = (v: number) =>
    Math.max(0, max ? Math.min(max, v) : Math.min(99999, v));

  const set = (v: number) => {
    const next = clamp(v);
    if (next !== value) onChange(next);
  };

  const digits = String(value).split("").map(Number);

  return (
    <div
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max ?? undefined}
      title={hint}
      className={cn(
        "font-disp plate tnum inline-flex cursor-ns-resize touch-none leading-none tracking-[-0.025em] select-none",
        className,
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { y: e.clientY, start: value, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dy = d.y - e.clientY;
        if (Math.abs(dy) > 4) d.moved = true;
        if (d.moved) set(d.start + Math.round(dy / PX_PER_PAGE));
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d && !d.moved) onActivate?.();
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onWheel={(e) => {
        wheelAcc.current += e.deltaY;
        const steps = Math.trunc(wheelAcc.current / 40);
        if (steps !== 0) {
          wheelAcc.current -= steps * 40;
          set(value - steps);
        }
      }}
      onKeyDown={(e) => {
        const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
        if (step) {
          e.preventDefault();
          set(value + step);
        } else if (e.key === "Home") {
          e.preventDefault();
          set(0);
        } else if (e.key === "End" && max) {
          e.preventDefault();
          set(max);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.();
        }
      }}
    >
      {digits.map((d, i) => (
        // keyed from the right so the units wheel keeps its identity
        <Wheel key={digits.length - i} digit={d} />
      ))}
    </div>
  );
}
