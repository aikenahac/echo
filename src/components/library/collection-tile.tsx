import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { collectionColors } from "@/lib/colors";
import { cn } from "@/lib/utils";

/** A collection's colour and Lucide icon (both user data) as a square tile. */
export function CollectionTile({
  colorTag,
  iconName,
  size = 40,
  className,
}: {
  colorTag?: string | null;
  iconName?: string | null;
  size?: number;
  className?: string;
}) {
  const { background, foreground } = collectionColors(colorTag);
  return (
    <span
      aria-hidden
      className={cn("grid flex-none place-items-center", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        background,
        color: foreground,
      }}
    >
      <DynamicIcon
        name={(iconName || "book") as IconName}
        size={Math.round(size * 0.5)}
        strokeWidth={1.8}
      />
    </span>
  );
}
