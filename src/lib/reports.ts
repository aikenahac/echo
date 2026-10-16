import { z } from "zod";

export const REPORT_TARGET_TYPES = ["user", "review"] as const;
export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "inappropriate",
  "other",
] as const;
export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_DETAILS_MAX = 500;
export const REPORT_NOTE_MAX = 1000;

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const reportInputSchema = z.object({
  targetId: z.string().min(1).max(200),
  reason: z.enum(REPORT_REASONS),
  details: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(REPORT_DETAILS_MAX).optional(),
  ),
});

export const reportIdSchema = z.uuid();

export const reportResolutionSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  note: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(REPORT_NOTE_MAX).optional(),
  ),
});
