"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FieldInput } from "@/components/echo/field-input";
import { Icon } from "@/components/echo/icons";

export function PasswordInput({
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: React.ReactNode;
  autoComplete: "current-password" | "new-password";
  autoFocus?: boolean;
}) {
  const t = useTranslations("auth");
  const [shown, setShown] = useState(false);
  return (
    <FieldInput
      label={label}
      type={shown ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      error={error || undefined}
      hint={hint}
      inputClassName="caret-pink-ink"
      trailing={
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? t("hidePassword") : t("showPassword")}
          aria-pressed={shown}
          className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-full text-ink-2 hover:bg-tint"
        >
          <Icon name={shown ? "eyeOff" : "eye"} size={22} />
        </button>
      }
    />
  );
}

/** Live "8 characters or more" check under a new password. */
export function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? "inline-flex items-center gap-1 text-pink-ink"
          : "inline-flex items-center gap-1 text-ink-2"
      }
    >
      <Icon name="check" size={14} strokeWidth={2.2} className={ok ? "" : "opacity-40"} />
      {label}
    </span>
  );
}
