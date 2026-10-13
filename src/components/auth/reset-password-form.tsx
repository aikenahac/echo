"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Capsule } from "@/components/echo/buttons";
import { FieldInput } from "@/components/echo/field-input";
import { CodeInput } from "./code-input";
import { PasswordInput, PasswordRule } from "./password-input";
import { AuthTitle } from "./auth-title";
import { clerkMessage, useFinishAuth } from "./use-finish-auth";

/** Forgot password: email → code + new password (reset_password_email_code). */
export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const { signIn, fetchStatus } = useSignIn();
  const finish = useFinishAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [error, setError] = useState<{
    field: "email" | "code" | "password" | "global";
    message: string;
  } | null>(null);
  const busy = fetchStatus === "fetching";
  const longEnough = password.length >= 8;

  const sendCode = async () => {
    const { error } = await signIn.resetPasswordEmailCode.sendCode();
    if (error) {
      setError({ field: "global", message: clerkMessage(error, t("errors.generic")) });
      return false;
    }
    return true;
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError({ field: "email", message: t("errors.emailRequired") });
    const { error } = await signIn.create({ identifier: email.trim() });
    if (error) return setError({ field: "email", message: clerkMessage(error, t("errors.generic")) });
    if (await sendCode()) setStep("reset");
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length < 6) return setError({ field: "code", message: t("errors.codeIncomplete") });
    if (!longEnough) return setError({ field: "password", message: t("errors.passwordShort") });
    const verified = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verified.error) return setError({ field: "code", message: clerkMessage(verified.error, t("errors.generic")) });
    const submitted = await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (submitted.error) return setError({ field: "password", message: clerkMessage(submitted.error, t("errors.generic")) });
    if (signIn.status === "complete") {
      const { error } = await signIn.finalize({ navigate: finish });
      if (error) setError({ field: "global", message: clerkMessage(error, t("errors.generic")) });
      return;
    }
    setError({ field: "global", message: t("errors.generic") });
  };

  if (step === "reset") {
    return (
      <form className="flex flex-1 flex-col" onSubmit={submitReset} noValidate>
        <AuthTitle
          title={t("reset.setTitle")}
          sub={t.rich("reset.setSub", {
            email: () => <b className="font-semibold text-ink">{email}</b>,
          })}
        />
        <CodeInput
          label={t("verify.code")}
          value={code}
          onChange={setCode}
          error={error?.field === "code" ? error.message : null}
          autoFocus
        />
        <div className="mt-5">
          <PasswordInput
            label={t("newPassword")}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            error={error?.field === "password" ? error.message : null}
            hint={<PasswordRule ok={longEnough} label={t("signUp.rule")} />}
          />
        </div>
        {error?.field === "global" && <p role="alert" className="mt-3 text-[13px] text-negative">{error.message}</p>}
        <div className="mt-auto pt-8 lg:mt-8 lg:pt-0">
          <Capsule type="submit" size="lg" className="w-full" disabled={busy}>
            {t("reset.save")}
          </Capsule>
          <p className="mt-5 text-center text-[15px] text-ink-2">
            {t("reset.noCode")}{" "}
            <button type="button" onClick={sendCode} className="cursor-pointer font-semibold text-pink-ink hover:underline">
              {t("reset.sendAgain")}
            </button>
          </p>
        </div>
      </form>
    );
  }

  return (
    <form className="flex flex-1 flex-col" onSubmit={submitEmail} noValidate>
      <AuthTitle title={t("reset.title")} sub={t("reset.sub")} />
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
      {error?.field === "global" && <p role="alert" className="mt-3 text-[13px] text-negative">{error.message}</p>}
      <div className="mt-auto pt-8 lg:mt-8 lg:pt-0">
        <Capsule type="submit" size="lg" className="w-full" disabled={busy}>
          {t("reset.send")}
        </Capsule>
      </div>
    </form>
  );
}
