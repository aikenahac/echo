import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  returning: vi.fn(),
  values: vi.fn(),
  notify: vi.fn(),
  acknowledge: vi.fn(),
  headers: new Map<string, string>(),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (key: string) => mocks.headers.get(key) ?? null }),
}));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: (v: unknown) => {
        mocks.values(v);
        return { returning: mocks.returning };
      },
    }),
  },
}));
vi.mock("@/lib/email", () => ({
  sendSupportTicketNotification: mocks.notify,
  sendSupportAcknowledgement: mocks.acknowledge,
}));

import { submitSupportTicket } from "@/app/[locale]/actions/support";

const valid = {
  name: "Ada",
  email: "ada@example.com",
  message: "I cannot find my library.",
  website: "",
};

let ipCounter = 0;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.SUPPORT_IP_SALT = "test-salt";
  // A fresh IP per test so the in-memory rate limiter doesn't leak between tests
  mocks.headers.clear();
  mocks.headers.set("x-forwarded-for", `10.0.0.${++ipCounter}, 10.9.9.9`);
  mocks.headers.set("user-agent", "vitest");
  mocks.returning.mockResolvedValue([{ id: "11111111-1111-4111-8111-111111111111" }]);
  mocks.notify.mockResolvedValue(undefined);
  mocks.acknowledge.mockResolvedValue(undefined);
});

describe("submitSupportTicket", () => {
  it("stores a valid ticket and sends both emails", async () => {
    const result = await submitSupportTicket(valid);

    expect(result).toEqual({ success: true, email: "ada@example.com" });
    expect(mocks.values).toHaveBeenCalledTimes(1);
    const stored = mocks.values.mock.calls[0][0];
    expect(stored).toMatchObject({ name: "Ada", email: "ada@example.com", userAgent: "vitest" });
    // Only a hash of the IP is stored
    expect(JSON.stringify(stored)).not.toContain("10.0.0.");
    expect(mocks.notify).toHaveBeenCalledTimes(1);
    expect(mocks.acknowledge).toHaveBeenCalledTimes(1);
  });

  it("returns field errors for invalid input and stores nothing", async () => {
    const result = await submitSupportTicket({ ...valid, email: "nope", message: "x" });

    expect(result).toEqual({
      success: false,
      error: "invalid",
      fieldErrors: { email: "emailInvalid", message: "messageTooShort" },
    });
    expect(mocks.values).not.toHaveBeenCalled();
  });

  it("rejects non-object and oversized input", async () => {
    expect(await submitSupportTicket("hello")).toMatchObject({ error: "invalid" });
    expect(
      await submitSupportTicket({ ...valid, message: "x".repeat(50_000) }),
    ).toMatchObject({ error: "invalid" });
    expect(mocks.values).not.toHaveBeenCalled();
  });

  it("silently drops honeypot submissions", async () => {
    const result = await submitSupportTicket({ ...valid, website: "http://spam.example" });

    expect(result).toEqual({ success: true, email: "ada@example.com" });
    expect(mocks.values).not.toHaveBeenCalled();
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("rate limits per IP after 5 requests", async () => {
    for (let i = 0; i < 5; i++) {
      const ok = await submitSupportTicket({ ...valid, email: `ada${i}@example.com` });
      expect(ok).toMatchObject({ success: true });
    }
    const blocked = await submitSupportTicket({ ...valid, email: "ada9@example.com" });
    expect(blocked).toEqual({ success: false, error: "rateLimited" });
    expect(mocks.values).toHaveBeenCalledTimes(5);
  });

  it("rate limits per email after 3 requests across IPs", async () => {
    const email = "repeat@example.com";
    for (let i = 0; i < 3; i++) {
      mocks.headers.set("x-forwarded-for", `10.1.${i}.1`);
      expect(await submitSupportTicket({ ...valid, email })).toMatchObject({ success: true });
    }
    mocks.headers.set("x-forwarded-for", "10.1.99.1");
    expect(await submitSupportTicket({ ...valid, email })).toEqual({
      success: false,
      error: "rateLimited",
    });
  });

  it("fails closed when SUPPORT_IP_SALT is missing", async () => {
    delete process.env.SUPPORT_IP_SALT;
    expect(await submitSupportTicket(valid)).toEqual({ success: false, error: "server" });
    expect(mocks.values).not.toHaveBeenCalled();
  });

  it("reports a server error when the insert fails, without logging the message", async () => {
    mocks.returning.mockRejectedValue(new Error("db down"));
    const result = await submitSupportTicket(valid);

    expect(result).toEqual({ success: false, error: "server" });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(valid.message);
  });

  it("still succeeds when email delivery fails", async () => {
    mocks.notify.mockRejectedValue(new Error("resend down"));
    const result = await submitSupportTicket(valid);

    expect(result).toMatchObject({ success: true });
  });
});
