// Shared by the server helper (src/lib/library-layout.ts) and the client hook
// (src/hooks/use-library-layout.ts), so it must not import server-only code.

export type LibraryLayout = "grid" | "list";

export const LIBRARY_LAYOUT_COOKIE = "library-layout";

export const DEFAULT_LIBRARY_LAYOUT: LibraryLayout = "grid";

export function parseLibraryLayout(value: string | undefined): LibraryLayout {
  return value === "list" || value === "grid" ? value : DEFAULT_LIBRARY_LAYOUT;
}
