"use server";

import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, promoCodes, subscriptionPlans } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { isPaidPlan } from "@/lib/plans";
import { generateCode, normalizeCode } from "@/lib/promo";
import { revalidateLocalized } from "@/lib/revalidate";

const createPromoCodeSchema = z
  .object({
    code: z.string().max(64).optional(),
    planId: z.uuid(),
    durationUnit: z.enum(["month", "year", "lifetime"]),
    durationCount: z.number().int().min(1).max(120).nullable().optional(),
    maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.durationUnit === "lifetime" || !!v.durationCount, {
    message: "Duration is required",
    path: ["durationCount"],
  });

export type CreatePromoCodeInput = z.input<typeof createPromoCodeSchema>;

/** Create a promo code (admin only). A blank code is generated. */
export async function createPromoCode(input: CreatePromoCodeInput) {
  const currentUser = await requireRole(["admin"]);

  const parsed = createPromoCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const code = data.code?.trim() ? normalizeCode(data.code) : generateCode();
  if (!code) return { error: "Codes are 4-32 letters and digits" };

  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.id, data.planId),
  });
  if (!plan) return { error: "Plan not found" };
  // Otherwise the grant wouldn't count as Premium
  if (!isPaidPlan(plan)) {
    return { error: "Choose a Premium plan (paid, Lemon Squeezy or lifetime)" };
  }

  try {
    const [created] = await db
      .insert(promoCodes)
      .values({
        code,
        planId: plan.id,
        durationUnit: data.durationUnit,
        durationCount: data.durationUnit === "lifetime" ? null : data.durationCount,
        maxUses: data.maxUses ?? null,
        note: data.note || null,
        createdBy: currentUser.id,
      })
      .onConflictDoNothing({ target: promoCodes.code })
      .returning();
    if (!created) return { error: "That code already exists" };

    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: "promo_code.create",
      targetId: created.id,
      targetType: "promo_code",
      metadata: JSON.stringify({ code, planId: plan.id, durationUnit: data.durationUnit, durationCount: created.durationCount, maxUses: created.maxUses }),
    });

    revalidateLocalized("/admin/promo-codes");
    return { success: true, code };
  } catch (error) {
    console.error("Error creating promo code:", error);
    return { error: "Failed to create promo code" };
  }
}

/** Enable or disable a promo code (admin only). Codes are never deleted, to keep their history. */
export async function setPromoCodeActive(id: string, isActive: boolean) {
  const currentUser = await requireRole(["admin"]);
  if (!z.uuid().safeParse(id).success || typeof isActive !== "boolean") {
    return { error: "Invalid input" };
  }

  try {
    await db.update(promoCodes).set({ isActive }).where(eq(promoCodes.id, id));
    await db.insert(auditLogs).values({
      userId: currentUser.id,
      action: isActive ? "promo_code.enable" : "promo_code.disable",
      targetId: id,
      targetType: "promo_code",
    });

    revalidateLocalized("/admin/promo-codes");
    return { success: true };
  } catch (error) {
    console.error("Error updating promo code:", error);
    return { error: "Failed to update promo code" };
  }
}

/** All promo codes with their plan, newest first (admin only) */
export async function listPromoCodes() {
  await requireRole(["admin"]);
  return db.query.promoCodes.findMany({
    orderBy: [desc(promoCodes.createdAt)],
    with: { plan: { columns: { id: true, name: true } } },
  });
}
