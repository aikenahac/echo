// Fixed-window, in-memory rate limiter. State lives in this process only, so
// it resets on deploy and isn't shared between instances: fine for the single
// container we run, and the limits here are abuse guards, not billing.
const windows = new Map<string, { count: number; resetAt: number }>();

/** Returns true if the call is allowed, false once `limit` is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow without bound
  if (windows.size > 10_000) {
    for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
  }

  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}
