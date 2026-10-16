import { cn } from "@/lib/utils";
import { Icon } from "./icons";
import { BlurhashImg } from "./blurhash-img";

/** A big Archivo numeral with the pink plate printed a few points off. */
export function PlateNumber({
  value,
  className,
}: {
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-disp plate tnum block leading-[.8] tracking-[-0.025em]",
        className,
      )}
    >
      {value}
    </span>
  );
}

/** 44px screen title in Archivo. */
export function ScreenTitle({
  children,
  className,
  as: As = "h1",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <As
      className={cn(
        "font-disp text-[44px] leading-none tracking-[-0.4px] md:text-[56px]",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** 28px Archivo section head. */
export function SectionHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-disp text-[28px] leading-none font-extrabold tracking-[-0.1px]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/** Small 13px semibold label over a group ("Also reading", "Favourites"). */
export function GroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("text-[13px] font-semibold text-ink-2", className)}>
      {children}
    </h2>
  );
}

/** Square initial tile (or photo) standing in for a person. */
export function AvatarTile({
  name,
  src,
  blurhash,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  /** Placeholder shown while the photo loads */
  blurhash?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={cn(
        "font-disp grid flex-none place-items-center overflow-hidden bg-tint font-extrabold text-ink",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size >= 64 ? 6 : 4,
        fontSize: size * 0.47,
        fontStretch: "75%",
      }}
    >
      {src && blurhash ? (
        <BlurhashImg src={src} blurhash={blurhash} />
      ) : src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

/** Five ink stars, read-only. */
export function Stars({
  value,
  size = 13,
  gap = 2,
  className,
  label,
}: {
  value: number;
  size?: number;
  gap?: number;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn("inline-flex text-ink", className)}
      style={{ gap }}
      role="img"
      aria-label={label ?? `${value} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          filled={i <= value}
          strokeWidth={1.4}
        />
      ))}
    </span>
  );
}

/** 3px progress bar, pink-ink on the hairline colour. */
export function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <span
      className={cn("block h-[3px] min-w-10 flex-1 rounded-sm bg-rule", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <i
        className="block h-full rounded-sm bg-pink-ink"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/**
 * The pink field: the ground for "in progress / now". Use `bleed` to run edge to
 * edge of the content column.
 */
export function FieldBand({
  children,
  className,
  as: As = "section",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "header";
}) {
  return <As className={cn("on-field bg-field", className)}>{children}</As>;
}

/** Page column with the standard gutters. */
export function Column({
  children,
  className,
  narrow,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 md:px-10",
        narrow ? "max-w-[760px]" : "max-w-[1180px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
