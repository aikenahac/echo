"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Capsule } from "@/components/echo/buttons";
import { FieldInput } from "@/components/echo/field-input";
import { CodeInput } from "./code-input";
import { PasswordInput } from "./password-input";
import { AuthTitle } from "./auth-title";
import { OAuthButtons } from "./oauth-buttons";
import { clerkMessage, useFinishAuth } from "./use-finish-auth";

export function SignInForm() {
  const t = useTranslations("auth");
  const { signIn, errors, fetchStatus } = useSignIn();
  const finish = useFinishAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"password" | "code">("password");
  const [error, setError] = useState<{
    field: "email" | "password" | "code" | "global";
    message: string;
  } | null>(null);
  const busy = fetchStatus === "fetching";

  const complete = async () => {
    const { error } = await signIn.finalize({ navigate: finish });
    if (error) setError({ field: "global", message: clerkMessage(error, t("errors.generic")) });
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError({ field: "email", message: t("errors.emailRequired") });
    if (!password) return setError({ field: "password", message: t("errors.passwordRequired") });

    const { error } = await signIn.password({ identifier: email.trim(), password });
    if (error) {
      const f = errors.fields;
      if (f.identifier) setError({ field: "email", message: f.identifier.longMessage || f.identifier.message });
      else setError({ field: "password", message: f.password?.longMessage || clerkMessage(error, t("errors.generic")) });
      return;
    }
    if (signIn.status === "complete") return complete();
    if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) return setError({ field: "global", message: clerkMessage(sendError, t("errors.generic")) });
      setStep("code");
      return;
    }
    setError({ field: "global", message: t("errors.generic") });
  };

  const submitCode = async (value = code) => {
    setError(null);
    if (value.length < 6) return setError({ field: "code", message: t("errors.codeIncomplete") });
    const { error } = await signIn.mfa.verifyEmailCode({ code: value });
    if (error) return setError({ field: "code", message: clerkMessage(error, t("errors.generic")) });
    if (signIn.status === "complete") return complete();
    setError({ field: "global", message: t("errors.generic") });
  };

  if (step === "code") {
    return (
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          submitCode();
        }}
      >
        <AuthTitle
          title={t("secondFactor.title")}
          sub={t.rich("secondFactor.sub", {
            email: () => <b className="font-semibold text-ink">{email}</b>,
          })}
        />
        <CodeInput
          label={t("verify.code")}
          value={code}
          onChange={setCode}
          onComplete={submitCode}
          error={error?.field === "code" ? error.message : null}
          autoFocus
        />
        {error?.field === "global" && <p role="alert" className="mt-3 text-[13px] text-negative">{error.message}</p>}
        <Capsule type="submit" size="lg" className="mt-auto w-full lg:mt-8" disabled={busy}>
          {t("verify.submit")}
        </Capsule>
      </form>
    );
  }

  return (
    <form className="flex flex-1 flex-col" onSubmit={submitPassword} noValidate>
      <AuthTitle title={t("signIn.title")} />
      <div className="flex flex-col gap-5">
        <FieldInput
          label={t("email")}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error?.field === "email" ? error.message : undefined}
        />
        <PasswordInput
          label={t("password")}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={error?.field === "password" ? error.message : null}
        />
      </div>
      <Link href="/reset-password" className="mt-4 self-start text-[15px] font-semibold text-pink-ink hover:underline">
        {t("signIn.forgot")}
      </Link>
      {error?.field === "global" && <p role="alert" className="mt-3 text-[13px] text-negative">{error.message}</p>}
      <div className="mt-auto pt-8 lg:mt-8 lg:pt-0">
        <Capsule type="submit" size="lg" className="w-full" disabled={busy}>
          {t("signIn.submit")}
        </Capsule>
        <div className="my-5 flex items-center gap-3 text-[13px] text-ink-3">
          <span className="h-px flex-1 bg-rule" />
          {t("or")}
          <span className="h-px flex-1 bg-rule" />
        </div>
        <OAuthButtons
          onError={(message) => setError({ field: "global", message })}
          className="[&>button]:h-[52px] [&>button]:border [&>button]:border-rule"
        />
        <p className="mt-5 text-center text-[15px] text-ink-2">
          {t("signIn.footer")}{" "}
          <Link href="/sign-up" className="font-semibold text-pink-ink hover:underline">
            {t("signIn.footerLink")}
          </Link>
        </p>
      </div>
    </form>
  );
}
