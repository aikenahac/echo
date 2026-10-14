import * as React from "react";
import { cn } from "@/lib/utils";

/** Labelled 12px-radius text field with an optional hint or inline error. */
export function FieldInput({
  label,
  hint,
  error,
  trailing,
  className,
  inputClassName,
  id,
  multiline,
  ...props
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const describedBy = error || hint ? `${inputId}-desc` : undefined;
  const box = cn(
    "flex w-full items-center gap-2 rounded-xl border bg-input-bg px-4 text-[17px] text-ink transition-colors focus-within:border-ink",
    error ? "border-negative focus-within:border-negative" : "border-rule",
    multiline ? "items-start py-3" : "h-[52px]",
  );
  return (
    <div className={cn("block", className)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-[13px] font-semibold text-ink-2"
        >
          {label}
        </label>
      ) : null}
      <div className={box}>
        {multiline ? (
          <textarea
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "min-h-28 w-full resize-none bg-transparent leading-6 outline-none placeholder:text-ink-3",
              inputClassName,
            )}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "h-full w-full min-w-0 bg-transparent outline-none placeholder:text-ink-3",
              inputClassName,
            )}
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {trailing}
      </div>
      {error || hint ? (
        <p
          id={describedBy}
          className={cn(
            "mt-1.5 text-[13px] leading-[18px]",
            error ? "text-negative" : "text-ink-2",
          )}
          role={error ? "alert" : undefined}
        >
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}
