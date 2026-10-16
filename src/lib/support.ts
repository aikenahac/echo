import { z } from "zod";

// Shared between the /support form (client) and the server actions. Error
// messages are stable codes, mapped to copy by the form via next-intl.

export const SUPPORT_LIMITS = {
  nameMax: 100,
  emailMax: 254,
  messageMin: 10,
  messageMax: 5000,
  noteMax: 5000,
} as const;

export const supportFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "nameRequired")
    .max(SUPPORT_LIMITS.nameMax, "nameTooLong"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "emailRequired")
    .max(SUPPORT_LIMITS.emailMax, "emailTooLong")
    .pipe(z.email("emailInvalid")),
  message: z
    .string()
    .trim()
    .min(SUPPORT_LIMITS.messageMin, "messageTooShort")
    .max(SUPPORT_LIMITS.messageMax, "messageTooLong"),
});

// Server-side schema: adds the honeypot, which real users never fill in
export const supportTicketSchema = supportFieldsSchema.extend({
  website: z.string().max(500).optional(),
});

export type SupportFields = z.infer<typeof supportFieldsSchema>;
export type SupportFieldName = keyof SupportFields;
export type SupportFieldErrors = Partial<Record<SupportFieldName, string>>;

export type SubmitSupportTicketResult =
  | { success: true; email: string }
  | { success: false; error: "rateLimited" | "server"; fieldErrors?: undefined }
  | { success: false; error: "invalid"; fieldErrors: SupportFieldErrors };

/** First error code per field from a failed parse of the support schemas */
export function toFieldErrors(error: z.ZodError): SupportFieldErrors {
  const fieldErrors: SupportFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "name" || field === "email" || field === "message") &&
      !fieldErrors[field]
    ) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

export const SUPPORT_STATUSES = ["open", "in_progress", "resolved"] as const;
export const supportStatusSchema = z.enum(SUPPORT_STATUSES);
export type SupportStatus = z.infer<typeof supportStatusSchema>;

export const supportTicketIdSchema = z.uuid();

export const supportNoteSchema = z
  .string()
  .trim()
  .max(SUPPORT_LIMITS.noteMax)
  .transform((note) => (note === "" ? null : note));

