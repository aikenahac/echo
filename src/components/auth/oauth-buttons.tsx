"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import { Capsule } from "@/components/echo/buttons";
import { cn } from "@/lib/utils";

function AppleLogo() {
  return (
    <svg viewBox="0 0 17 20" width="17" height="20" aria-hidden fill="currentColor">
      <path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM11.6 3c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

/** Continue with Apple / Google. New users are signed up by Clerk as needed. */
export function OAuthButtons({
  className,
  onError,
}: {
  className?: string;
  onError?: (message: string) => void;
}) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const { signIn } = useSignIn();
  const [pending, setPending] = useState<string | null>(null);

  const start = async (strategy: "oauth_google" | "oauth_apple") => {
    setPending(strategy);
    const { error } = await signIn.sso({
      strategy,
      redirectUrl: `/${locale}/library`,
      redirectCallbackUrl: `/${locale}/sso-callback`,
    });
    if (error) {
      setPending(null);
      onError?.(error.message || t("errors.generic"));
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <Capsule
        type="button"
        size="lg"
        className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black"
        onClick={() => start("oauth_apple")}
        disabled={!!pending}
      >
        <AppleLogo />
        {t("continueApple")}
      </Capsule>
      <Capsule
        type="button"
        size="lg"
        variant="paper"
        className="text-[#170B11] [background:#FBF7F8]"
        onClick={() => start("oauth_google")}
        disabled={!!pending}
      >
        <GoogleLogo />
        {t("continueGoogle")}
      </Capsule>
    </div>
  );
}
