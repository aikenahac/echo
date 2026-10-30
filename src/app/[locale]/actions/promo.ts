"use server";

import { auth } from "@clerk/nextjs/server";
import { redeemPromo, type RedeemResult } from "@/lib/promo";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateLocalized } from "@/lib/revalidate";

const REDEEM_LIMIT = 10;
const REDEEM_WINDOW_MS = 10 * 60 * 1000;

/** Redeem a promo code for the signed-in user. Rate limited against guessing. */
export async function redeemPromoCode(code: unknown): Promise<RedeemResult | { ok: false; error: "unauthorized" | "server" }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "unauthorized" };
  if (typeof code !== "string" || code.length > 64) return { ok: false, error: "invalid" };

  if (!rateLimit(`promo:${userId}`, REDEEM_LIMIT, REDEEM_WINDOW_MS)) {
    return { ok: false, error: "rateLimited" };
  }

  try {
    const result = await redeemPromo(userId, code);
    if (result.ok) revalidateLocalized("/settings", "/subscription", "/library");
    return result;
  } catch (error) {
    console.error("Error redeeming promo code:", error);
    return { ok: false, error: "server" };
  }
}
