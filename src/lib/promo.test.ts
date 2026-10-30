import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

import { generateCode, normalizeCode, promoEnd } from "@/lib/promo";

describe("normalizeCode", () => {
  it("uppercases and strips spaces and dashes", () => {
    expect(normalizeCode("  echo-2026 fr ")).toBe("ECHO2026FR");
  });
  it("rejects codes that are too short or have other characters", () => {
    expect(normalizeCode("abc")).toBeNull();
    expect(normalizeCode("ECHO_2026")).toBeNull();
    expect(normalizeCode("A".repeat(33))).toBeNull();
  });
});

describe("generateCode", () => {
  it("makes valid codes without ambiguous characters", () => {
    const code = generateCode();
    expect(code).toHaveLength(10);
    expect(normalizeCode(code)).toBe(code);
    expect(code).not.toMatch(/[01OIL]/);
  });
});

describe("promoEnd", () => {
  const start = new Date("2026-01-31T12:00:00Z");
  it("adds calendar months, clamping to the month's end", () => {
    expect(promoEnd(start, "month", 1)).toEqual(new Date("2026-02-28T12:00:00Z"));
  });
  it("adds years", () => {
    expect(promoEnd(start, "year", 2)).toEqual(new Date("2028-01-31T12:00:00Z"));
  });
  it("has no end for lifetime", () => {
    expect(promoEnd(start, "lifetime", null)).toBeNull();
  });
});
