"use client";

import { useState, FormEvent } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAuthButton } from "@/components/oauth-button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signUp) return;

    // Validation
    if (!email || !password || !confirmPassword) {
      toast.error(t("allFieldsRequired"));
      return;
    }

    if (!validateEmail(email)) {
      toast.error(t("invalidEmail"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("passwordsDontMatch"));
      return;
    }

    setIsLoading(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setIsVerifying(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Sign-up error:", err);
      const errorMessage = err?.errors?.[0]?.message || "An error occurred during sign-up";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();

    if (!isLoaded || !signUp) return;

    if (!code || code.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.push("/library");
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Verification error:", err);
      const errorMessage = err?.errors?.[0]?.message || "Invalid verification code";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return null;
  }

  if (isVerifying) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center mb-8">
          <Image src="/echo.svg" alt="Echo" width={120} height={55} priority />
        </div>

        <div className="space-y-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{t("verifyEmail")}</h1>
            <p className="text-sm text-muted-foreground">{t("enterCode")}</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : t("verify")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-8">
        <Image src="/echo.svg" alt="Echo" width={120} height={55} priority />
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <OAuthButton strategy="oauth_google" className="w-1/2">
            {t("signInWithGoogle")}
          </OAuthButton>
          <OAuthButton strategy="oauth_apple" className="w-1/2">
            {t("signInWithApple")}
          </OAuthButton>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t("or")}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : t("continue")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/sign-in" className="text-primary hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
