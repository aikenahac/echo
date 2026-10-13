import "server-only";
import { cookies } from "next/headers";
import {
  APPEARANCE_COOKIE,
  parseAppearance,
  type Appearance,
} from "@/lib/appearance-cookie";

/**
 * Read the light/dark/system appearance preference, so <html> renders with the
 * right data-theme on the server (no flash).
 */
export async function getAppearance(): Promise<Appearance> {
  const cookieStore = await cookies();
  return parseAppearance(cookieStore.get(APPEARANCE_COOKIE)?.value);
}
