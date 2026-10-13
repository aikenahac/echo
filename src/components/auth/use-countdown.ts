"use client";

import { useEffect, useState } from "react";

/** Seconds left until a code can be resent; `restart()` starts it again. */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const label = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return { left, label, restart: () => setLeft(seconds) };
}
