import { describe, expect, it } from "vitest";
import {
  supportNoteSchema,
  supportStatusSchema,
  supportTicketSchema,
  toFieldErrors,
} from "@/lib/support";

const valid = {
  name: "  Ada Lovelace ",
  email: "  Ada@Example.com ",
  message: "  I cannot find my library.  ",
};

describe("supportTicketSchema", () => {
  it("trims and normalizes valid input", () => {
    const parsed = supportTicketSchema.parse(valid);
    expect(parsed).toMatchObject({
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "I cannot find my library.",
    });
  });

  it("reports a code per invalid field", () => {
    const result = supportTicketSchema.safeParse({
      name: "   ",
      email: "nope",
      message: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({
        name: "nameRequired",
        email: "emailInvalid",
        message: "messageTooShort",
      });
    }
  });

  it("enforces upper bounds", () => {
    const result = supportTicketSchema.safeParse({
      name: "x".repeat(101),
      email: `${"a".repeat(250)}@example.com`,
      message: "x".repeat(5001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(toFieldErrors(result.error)).toEqual({
        name: "nameTooLong",
        email: "emailTooLong",
        message: "messageTooLong",
      });
    }
  });

  it("accepts boundary lengths", () => {
    expect(
      supportTicketSchema.safeParse({
        name: "x".repeat(100),
        email: "a@b.co",
        message: "x".repeat(10),
      }).success,
    ).toBe(true);
    expect(
      supportTicketSchema.safeParse({ ...valid, message: "x".repeat(5000) }).success,
    ).toBe(true);
  });
});

describe("admin schemas", () => {
  it("only accepts known statuses", () => {
    expect(supportStatusSchema.safeParse("resolved").success).toBe(true);
    expect(supportStatusSchema.safeParse("closed").success).toBe(false);
  });

  it("turns an empty note into null", () => {
    expect(supportNoteSchema.parse("   ")).toBeNull();
    expect(supportNoteSchema.parse(" call back ")).toBe("call back");
  });
});
