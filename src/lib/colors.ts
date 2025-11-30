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
