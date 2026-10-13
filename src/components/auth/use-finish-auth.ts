"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

/**
 * The `navigate` callback for `signIn.finalize` / `signUp.finalize`: lands the
 * new session in the library.
 */
export function useFinishAuth() {
  const router = useRouter();
  const locale = useLocale();
  return ({
    decorateUrl,
  }: {
    decorateUrl: (url: string) => string;
  }) => {
    const url = decorateUrl(`/${locale}/library`);
    if (url.startsWith("http")) {
      window.location.href = url;
    } else {
      router.push(url);
      router.refresh();
    }
  };
}

/** First readable message from a Clerk error. */
export function clerkMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const e = error as {
    errors?: { longMessage?: string; message?: string }[];
    longMessage?: string;
    message?: string;
  };
  return (
    e.errors?.[0]?.longMessage ||
    e.errors?.[0]?.message ||
    e.longMessage ||
    e.message ||
    fallback
  );
}
