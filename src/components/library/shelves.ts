// Shared by the library page (server) and the header (client), so it must not
// live in a "use client" module.

export type Shelf = "reading" | "want" | "finished" | "favourites";
export const SHELVES: Shelf[] = ["reading", "want", "finished", "favourites"];
