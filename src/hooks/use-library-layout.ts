"use client";

import { useState } from "react";
import {
  LIBRARY_LAYOUT_COOKIE,
  type LibraryLayout,
} from "@/lib/library-layout-cookie";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * Grid/list layout preference for the library. The initial value is read from
 * the cookie on the server (see getLibraryLayout) and changes are written back
 * to the cookie.
 */
export function useLibraryLayout(initialLayout: LibraryLayout) {
  const [layout, setLayout] = useState<LibraryLayout>(initialLayout);

  const updateLayout = (newLayout: LibraryLayout) => {
    setLayout(newLayout);
    document.cookie = `${LIBRARY_LAYOUT_COOKIE}=${newLayout}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
  };

  return {
    layout,
    setLayout: updateLayout,
  };
}
