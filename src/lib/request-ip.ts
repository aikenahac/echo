import { createHmac } from "node:crypto";

/**
 * Best-effort client IP from proxy headers (first hop of x-forwarded-for,
 * then x-real-ip). Only as trustworthy as the reverse proxy in front of us.
 */
export function getClientIp(headers: Pick<Headers, "get">) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Keyed hash of an IP for abuse handling, so raw addresses are never stored.
 * Throws when SUPPORT_IP_SALT is missing rather than falling back to a weaker
 * (unkeyed) hash.
 */
export function hashIp(ip: string) {
  const salt = process.env.SUPPORT_IP_SALT;
  if (!salt) throw new Error("SUPPORT_IP_SALT is not set");
  return createHmac("sha256", salt).update(ip).digest("hex");
}
