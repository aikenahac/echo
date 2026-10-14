import { cn } from "@/lib/utils";

const sizes = {
  // mini stamp on small covers and in rows
  xs: "text-[11px] px-1 pt-[2px] pb-px border-[1.5px] tracking-[.4px]",
  sm: "text-[15px] px-2 pt-1 pb-[3px] border-2 outline-2 outline-offset-2 tracking-[.4px]",
  md: "text-[22px] pl-2.5 pr-2 pt-1.5 pb-[5px] border-2 outline-2 outline-offset-2 tracking-[.5px]",
  lg: "text-[34px] px-3 pt-1.5 pb-1 border-[3px] outline-[3px] outline-offset-[3px] tracking-[1px]",
} as const;

/**
 * The ink stamp: a double-ruled label set in Archivo, struck at an angle.
 * Used for FINISHED / READING / WANT, PREMIUM and LIFETIME.
 */
export function Stamp({
  children,
  size = "md",
  rotate = -6,
  className,
  animate,
}: {
  children: React.ReactNode;
  size?: keyof typeof sizes;
  rotate?: number;
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-disp inline-flex items-center gap-1.5 whitespace-nowrap border-ink bg-paper leading-none text-ink uppercase outline-solid outline-ink",
        size === "xs" && "outline-none",
        sizes[size],
        animate && "animate-stamp",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}
