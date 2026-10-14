// Shared by the server helper (src/lib/appearance.ts) and the settings page
// client code, so it must not import server-only code.

export type Appearance = "system" | "light" | "dark";

export const APPEARANCE_COOKIE = "appearance";

export function parseAppearance(value: string | undefined): Appearance {
  return value === "light" || value === "dark" ? value : "system";
}
