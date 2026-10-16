"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Icon } from "@/components/echo/icons";
import { cn } from "@/lib/utils";

/** Terms/Privacy consent for sign-up; passed to Clerk as `legalAccepted`. */
export function LegalCheckbox({
  checked,
  onChange,
  error,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
  className?: string;
}) {
  const t = useTranslations("auth");
  const id = useId();
  const linkClass = "font-semibold text-ink underline underline-offset-2";

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 grid size-5 flex-none">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "peer size-5 cursor-pointer appearance-none rounded-md border bg-input-bg transition-colors checked:border-pink-ink checked:bg-pink-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              error ? "border-negative" : "border-rule",
            )}
          />
          <Icon
            name="check"
            size={14}
            strokeWidth={2.6}
            className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100"
          />
        </span>
        <label htmlFor={id} className="cursor-pointer text-[14px] leading-5 text-ink-2">
          {t.rich("signUp.legal", {
            terms: (chunks) => (
              <Link href="/documents/terms-of-service" target="_blank" className={linkClass}>
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/documents/privacy-policy" target="_blank" className={linkClass}>
                {chunks}
              </Link>
            ),
          })}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
