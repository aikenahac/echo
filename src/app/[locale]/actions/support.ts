"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/request-ip";
import {
  sendSupportAcknowledgement,
  sendSupportTicketNotification,
} from "@/lib/email";
import {
  supportTicketSchema,
  toFieldErrors,
  type SubmitSupportTicketResult,
} from "@/lib/support";

const HOUR_MS = 60 * 60 * 1000;
const IP_LIMIT_PER_HOUR = 5;
const EMAIL_LIMIT_PER_HOUR = 3;
// Anything this long is rejected before parsing; the schema limits are far lower
const MAX_RAW_FIELD_LENGTH = 20_000;

function hasOversizedField(input: Record<string, unknown>) {
  return Object.values(input).some(
    (value) => typeof value === "string" && value.length > MAX_RAW_FIELD_LENGTH,
  );
}

/**
 * Public (unauthenticated) support form submission. Server actions are public
 * POST endpoints, so everything is validated and rate limited here. Never log
 * the message body.
 */
export async function submitSupportTicket(
  input: unknown,
): Promise<SubmitSupportTicketResult> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { success: false, error: "invalid", fieldErrors: {} };
  }

  const requestHeaders = await headers();

  let ipHash: string;
  try {
    ipHash = hashIp(getClientIp(requestHeaders));
  } catch {
    console.error("[support] could not hash client ip (SUPPORT_IP_SALT set?)");
    return { success: false, error: "server" };
  }

  if (!rateLimit(`support:ip:${ipHash}`, IP_LIMIT_PER_HOUR, HOUR_MS)) {
    return { success: false, error: "rateLimited" };
  }

  const raw = Object.fromEntries(Object.entries(input));
  if (hasOversizedField(raw)) {
    return { success: false, error: "invalid", fieldErrors: {} };
  }

  const parsed = supportTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: "invalid",
      fieldErrors: toFieldErrors(parsed.error),
    };
  }

  // Honeypot: bots fill every field. Pretend it worked, store nothing.
  if (parsed.data.website) {
    return { success: true, email: parsed.data.email };
  }

  const { name, email, message } = parsed.data;

  if (!rateLimit(`support:email:${email}`, EMAIL_LIMIT_PER_HOUR, HOUR_MS)) {
    return { success: false, error: "rateLimited" };
  }

  let ticketId: string;
  try {
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        name,
        email,
        message,
        ipHash,
        userAgent: requestHeaders.get("user-agent")?.slice(0, 255) ?? null,
      })
      .returning({ id: supportTickets.id });
    ticketId = ticket.id;
  } catch {
    console.error("[support] failed to store ticket");
    return { success: false, error: "server" };
  }

  // The admin panel is the source of truth; email failures must not fail the request
  const sent = await Promise.allSettled([
    sendSupportTicketNotification({ id: ticketId, name, email, message }),
    sendSupportAcknowledgement({ name, email, message }),
  ]);
  for (const result of sent) {
    if (result.status === "rejected") {
      console.error(
        "[support] email failed:",
        result.reason instanceof Error ? result.reason.message : "unknown",
      );
    }
  }

  return { success: true, email };
}
