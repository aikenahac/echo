/**
 * Tailwind color utilities for collection customization
 * Provides 80 color options across 20 palettes with 4 shades each
 */

// Import color class references to ensure Tailwind v4 JIT includes them
import "@/lib/color-classes";

export type ColorPalette =
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

export type ColorShade = "100" | "300" | "500" | "700";

export type ColorValue = `${ColorPalette}-${ColorShade}`;

export interface ColorOption {
  name: string;
  value: ColorValue;
  palette: ColorPalette;
  shade: ColorShade;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const PALETTES: ColorPalette[] = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
];

const SHADES: ColorShade[] = ["100", "300", "500", "700"];

/**
 * Generate all 80 color options
 */
function generateColors(): ColorOption[] {
  const colors: ColorOption[] = [];

  for (const palette of PALETTES) {
    for (const shade of SHADES) {
      const value: ColorValue = `${palette}-${shade}`;
      const name = `${palette.charAt(0).toUpperCase() + palette.slice(1)} ${shade}`;

      colors.push({
        name,
        value,
        palette,
        shade,
        bgClass: `bg-${palette}-${shade}`,
        textClass: `text-${palette}-${shade}`,
        borderClass: `border-${palette}-${shade}`,
      });
    }
  }

  return colors;
}

/**
 * All available color options (80 total)
 */
export const COLORS: ColorOption[] = generateColors();

/**
 * Colors grouped by palette for organized UI display
 */
export const COLORS_BY_PALETTE: Record<ColorPalette, ColorOption[]> = PALETTES.reduce(
  (acc, palette) => {
    acc[palette] = COLORS.filter((color) => color.palette === palette);
    return acc;
  },
  {} as Record<ColorPalette, ColorOption[]>
);

/**
 * Validate if a color value is valid
 */
export function isValidColor(colorValue: string): colorValue is ColorValue {
  return COLORS.some((color) => color.value === colorValue);
}

/**
 * Get a color option by its value
 */
export function getColorOption(colorValue: string): ColorOption | undefined {
  return COLORS.find((color) => color.value === colorValue);
}

/**
 * Get Tailwind class name for a color
 */
export function getColorClass(
  colorValue: string,
  type: "bg" | "text" | "border" = "bg"
): string {
  const color = getColorOption(colorValue);
  if (!color) {
    // Fallback to default blue-500
    return type === "bg" ? "bg-blue-500" : type === "text" ? "text-blue-500" : "border-blue-500";
  }

  switch (type) {
    case "bg":
      return color.bgClass;
    case "text":
      return color.textClass;
    case "border":
      return color.borderClass;
  }
}

/**
 * Default color value for new collections
 */
export const DEFAULT_COLOR: ColorValue = "blue-500";

/**
 * The six riso inks offered by the collection editor, stored as Tailwind
 * palette tokens so older clients keep working. Each prints as its own hex.
 */
export const RISO_SWATCHES: {
  name: string;
  value: ColorValue;
  hex: string;
  onColor: string;
}[] = [
  { name: "Ink", value: "zinc-700", hex: "#2B2226", onColor: "#FFFFFF" },
  { name: "Burgundy", value: "pink-700", hex: "#A3195B", onColor: "#FFFFFF" },
  { name: "Pink", value: "pink-300", hex: "#FF8DBF", onColor: "#170B11" },
  { name: "Red-orange", value: "orange-500", hex: "#F2552C", onColor: "#FFFFFF" },
  { name: "Mustard", value: "amber-500", hex: "#E3A21A", onColor: "#170B11" },
  { name: "Teal", value: "teal-700", hex: "#176B67", onColor: "#FFFFFF" },
];

const LIGHT_SHADES = new Set(["100", "300"]);

/**
 * Background and foreground colours for a collection's stored colour token.
 * Riso inks print as their own hex; legacy tokens use the Tailwind palette.
 */
export function collectionColors(colorTag?: string | null): {
  background: string;
  foreground: string;
} {
  const tag = colorTag && isValidColor(colorTag) ? colorTag : DEFAULT_COLOR;
  const riso = RISO_SWATCHES.find((s) => s.value === tag);
  if (riso) return { background: riso.hex, foreground: riso.onColor };
  const shade = tag.split("-")[1];
  return {
    background: `var(--color-${tag})`,
    foreground: LIGHT_SHADES.has(shade) ? "#170B11" : "#FFFFFF",
  };
}
