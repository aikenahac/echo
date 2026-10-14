import "server-only";
import { cookies } from "next/headers";
import {
  LIBRARY_LAYOUT_COOKIE,
  parseLibraryLayout,
  type LibraryLayout,
} from "@/lib/library-layout-cookie";

/**
 * Read the user's grid/list library layout preference from its cookie, so the
 * library renders in the right layout on the server (no flash on hydration).
 */
export async function getLibraryLayout(): Promise<LibraryLayout> {
  const cookieStore = await cookies();
  return parseLibraryLayout(cookieStore.get(LIBRARY_LAYOUT_COOKIE)?.value);
}
