import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A book cover drawn as an object: 2:3, a smaller radius on the spine side, a
 * spine highlight and one long soft shadow. Covers are the only things in the
 * design that cast shadows. Books without an image get a designed fallback.
 */
export function Cover({
  src,
  title,
  author,
  width,
  className,
  priority,
  sizes,
  shadow = true,
  fluid,
  children,
}: {
  src?: string | null;
  title: string;
  author?: string | null;
  /** Rendered width in px; sets the image sizes hint and fallback type size. */
  width: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  shadow?: boolean;
  /** Fill the parent's width; `width` then only sizes the fallback type. */
  fluid?: boolean;
  children?: React.ReactNode;
}) {
  const fallbackSize = width >= 120 ? 22 : width >= 70 ? 17 : width >= 44 ? 12 : 8;
  return (
    <div
      className={cn(
        "relative aspect-[2/3] flex-none overflow-hidden rounded-[1.5px_3px_3px_1.5px] bg-tint",
        className,
      )}
      style={{
        width: fluid ? "100%" : width,
        boxShadow: shadow ? "var(--cover-shadow)" : undefined,
      }}
    >
      {src ? (
        <Image
          src={src}
          alt={title}
          fill
          priority={priority}
          sizes={sizes ?? `${Math.ceil(width * 2)}px`}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between border-l-[5px] border-pink-ink bg-tint p-[8%] text-ink">
          <b
            className="font-disp line-clamp-5 break-words"
            style={{ fontSize: fallbackSize, lineHeight: 0.95 }}
          >
            {title}
          </b>
          {author && width >= 56 ? (
            <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
              {author}
            </span>
          ) : null}
        </div>
      )}
      {/* spine highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(0,0,0,.16) 0, rgba(255,255,255,.16) 2.5%, rgba(0,0,0,.06) 5%, transparent 9%)",
        }}
      />
      {children}
    </div>
  );
}
