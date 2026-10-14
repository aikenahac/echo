import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape LIKE/ILIKE wildcards so user input is matched literally
 */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a value is a UUID. Check route params before querying uuid columns,
 * which would otherwise throw on malformed input.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}
