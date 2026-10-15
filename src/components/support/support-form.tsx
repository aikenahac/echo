"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Capsule } from "@/components/echo/buttons";
import { FieldInput } from "@/components/echo/field-input";
import { submitSupportTicket } from "@/app/[locale]/actions/support";
import {
  SUPPORT_LIMITS,
  supportFieldsSchema,
  toFieldErrors,
  type SupportFieldErrors,
} from "@/lib/support";

type FormError = "rateLimited" | "server" | null;

export function SupportForm() {
  const t = useTranslations("support");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [fieldErrors, setFieldErrors] = useState<SupportFieldErrors>({});
  const [formError, setFormError] = useState<FormError>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const errorText = (code: string | undefined) => {
    switch (code) {
      case "nameRequired":
      case "nameTooLong":
      case "emailRequired":
      case "emailTooLong":
      case "emailInvalid":
      case "messageTooShort":
      case "messageTooLong":
        return t(`errors.${code}`);
      default:
        return code ? t("serverError") : undefined;
    }
  };

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);

    const parsed = supportFieldsSchema.safeParse({ name, email, message });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      try {
        const result = await submitSupportTicket({
          name,
          email,
          message,
          website,
        });
        if (result.success) {
          setSentTo(result.email);
        } else if (result.error === "invalid") {
          setFieldErrors(result.fieldErrors);
        } else {
          setFormError(result.error);
        }
      } catch {
        // Keep what the person typed so they can retry
        setFormError("server");
      }
    });
  }

  if (sentTo) {
    return (
      <div role="status" className="hairline-t pt-6">
        <h2 className="font-disp text-[32px] leading-none">
          {t("successTitle", { email: sentTo })}
        </h2>
        <p className="mt-3 text-[17px] leading-6 text-ink-2">
          {t("successBody")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FieldInput
        label={t("name")}
        name="name"
        autoComplete="name"
        required
        maxLength={SUPPORT_LIMITS.nameMax + 50}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errorText(fieldErrors.name)}
      />
      <FieldInput
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errorText(fieldErrors.email)}
      />
      <div>
        <FieldInput
          label={t("message")}
          name="message"
          multiline
          required
          rows={7}
          placeholder={t("messagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          error={errorText(fieldErrors.message)}
        />
        <p
          aria-live="polite"
          className="tnum mt-1.5 text-right text-[13px] text-ink-2"
        >
          {t("charCount", {
            count: message.trim().length,
            max: SUPPORT_LIMITS.messageMax,
          })}
        </p>
      </div>

      {/* Honeypot: hidden from people and assistive tech, bots fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {formError ? (
        <p role="alert" className="text-[15px] text-negative">
          {formError === "rateLimited" ? t("rateLimited") : t("serverError")}
        </p>
      ) : null}

      <Capsule
        type="submit"
        variant="field"
        size="lg"
        disabled={pending}
        className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending ? t("sending") : t("submit")}
      </Capsule>
    </form>
  );
}
