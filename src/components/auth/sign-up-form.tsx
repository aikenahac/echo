"use client";

import { useState } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Capsule } from "@/components/echo/buttons";
import { FieldInput } from "@/components/echo/field-input";
import { Icon } from "@/components/echo/icons";
import { CodeInput } from "./code-input";
import { PasswordInput, PasswordRule } from "./password-input";
import { AuthTitle } from "./auth-title";
import { OAuthButtons } from "./oauth-buttons";
import { clerkMessage, useFinishAuth } from "./use-finish-auth";
import { useCountdown } from "./use-countdown";

export function SignUpForm() {
  const t = useTranslations("auth");
  const { signUp, errors, fetchStatus } = useSignUp();
  const finish = useFinishAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [error, setError] = useState<{
    field: "email" | "password" | "code" | "global";
    message: string;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const countdown = useCountdown(60);
  const busy = fetchStatus === "fetching";
  const longEnough = password.length >= 8;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError({ field: "email", message: t("errors.emailRequired") });
    if (!longEnough) return setError({ field: "password", message: t("errors.passwordShort") });

    const { error } = await signUp.password({ emailAddress: email.trim(), password });
    if (error) {
      const f = errors.fields;
      if (f.emailAddress) return setError({ field: "email", message: f.emailAddress.longMessage || f.emailAddress.message });
      if (f.password) return setError({ field: "password", message: f.password.longMessage || f.password.message });
      return setError({ field: "global", message: clerkMessage(error, t("errors.generic")) });
    }
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) return setError({ field: "global", message: clerkMessage(sendError, t("errors.generic")) });
    countdown.restart();
    setStep("verify");
  };

  const verify = async (value = code) => {
    setError(null);
    if (value.length < 6) return setError({ field: "code", message: t("errors.codeIncomplete") });
    const { error } = await signUp.verifications.verifyEmailCode({ code: value });
    if (error) return setError({ field: "code", message: clerkMessage(error, t("errors.generic")) });
    if (signUp.status === "complete") {
      const { error: finalizeError } = await signUp.finalize({ navigate: finish });
      if (finalizeError) setError({ field: "global", message: clerkMessage(finalizeError, t("errors.generic")) });
      return;
    }
    setError({ field: "global", message: t("errors.generic") });
  };

  const resend = async () => {
    setError(null);
    const { error } = await signUp.verifications.sendEmailCode();
    if (error) return setError({ field: "global", message: clerkMessage(error, t("errors.generic")) });
    countdown.restart();
    setNotice(t("verify.sent"));
  };

  if (step === "verify") {
    return (
      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
      >
        <AuthTitle
          title={t("verify.title")}
          sub={t.rich("verify.sub", {
            email: () => <b className="font-semibold text-ink">{email}</b>,
          })}
        />
        <CodeInput
          label={t("verify.code")}
          value={code}
          onChange={setCode}
          onComplete={verify}
          error={error?.field === "code" ? error.message : null}
          autoFocus
        />
        <p className="mt-3 text-[13px] text-ink-2 tnum" aria-live="polite">
          {countdown.left > 0 ? (
            t("verify.resendIn", { time: countdown.label })
          ) : (
            <button type="button" onClick={resend} className="cursor-pointer font-semibold text-pink-ink hover:underline">
              {t("verify.resend")}
            </button>
          )}
          {notice && countdown.left > 0 ? ` · ${notice}` : null}
        </p>
        {error?.field === "global" && <p role="alert" className="mt-3 text-[13px] text-negative">{error.message}</p>}
        <div className="mt-auto pt-8 lg:mt-8 lg:pt-0">
          <Capsule type="submit" size="lg" className="w-full" disabled={busy}>
            {t("verify.submit")}
          </Capsule>
          <Capsule asChild variant="outline" size="lg" className="mt-3 w-full">
            <a href="mailto:">
              <Icon name="mail" size={20} />
              Open Mail
            </a>
          </Capsule>
          <p className="mt-5 text-center text-[15px] text-ink-2">
            {t("verify.wrongAddress")}{" "}
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setCode("");
                setError(null);
              }}
              className="cursor-pointer font-semibold text-pink-ink hover:underline"
            >
              {t("verify.changeEmail")}
            </button>
          </p>
        </div>
      </form>
    );
  }

  return (
    <form className="flex flex-1 flex-col" onSubmit={submit} noValidate>
      <AuthTitle title={t("signUp.title")} sub={t("signUp.sub")} />
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
          autoComplete="new-password"
          error={error?.field === "password" ? error.message : null}
          hint={<PasswordRule ok={longEnough} label={t("signUp.rule")} />}
        />
      </div>
      {/* Clerk's bot protection mounts here when enabled */}
      <div id="clerk-captcha" className="mt-4" />
      {error?.field === "global" && <p role="alert" className="mt-3 text-[13px] text-negative">{error.message}</p>}
      <div className="mt-auto pt-8 lg:mt-8 lg:pt-0">
        <Capsule type="submit" size="lg" className="w-full" disabled={busy}>
          {t("signUp.submit")}
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
          {t("signUp.footer")}{" "}
          <Link href="/sign-in" className="font-semibold text-pink-ink hover:underline">
            {t("signUp.footerLink")}
          </Link>
        </p>
      </div>
    </form>
  );
}
