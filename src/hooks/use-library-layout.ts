"use client";

import { useState, useEffect } from "react";

type LibraryLayout = "grid" | "list";

const STORAGE_KEY = "library-layout-preference";

export function useLibraryLayout() {
  const [layout, setLayout] = useState<LibraryLayout>("grid");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "list" || stored === "grid") {
      setLayout(stored);
    }
    setIsLoaded(true);
  }, []);

  const updateLayout = (newLayout: LibraryLayout) => {
    setLayout(newLayout);
    localStorage.setItem(STORAGE_KEY, newLayout);
  };

  return {
    layout,
    setLayout: updateLayout,
    isLoaded,
  };
}
