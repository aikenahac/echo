"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming you have shadcn's utility function 'cn'

/**
 * Props for the NumberSpinner component.
 * @param value The current number value (controlled from parent).
 * @param onChange The function to call when the value is committed (on the
 * +/- buttons, on blur or on Enter - not on every keystroke).
 * @param max Optional upper bound, disables the + button when reached.
 * @param className Optional class names to apply to the container div.
 */
type NumberSpinnerProps = {
  value: number;
  onChange: (newValue: number) => void;
  max?: number | null;
  className?: string;
}

export function NumberSpinner({
  value,
  onChange,
  max,
  className,
}: NumberSpinnerProps) {
  // What the user is typing, null when not editing (then `value` is shown)
  const [draft, setDraft] = React.useState<string | null>(null);

  const handleDecrement = () => {
    // Prevent the value from going below 0
    if (value > 0) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    onChange(value + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, which also keeps the value non-negative
    setDraft(e.target.value.replace(/\D/g, ""));
  };

  const commitDraft = () => {
    if (draft === null) {
      return;
    }

    // If the input is empty or invalid, default to 0.
    const parsed = parseInt(draft, 10);
    const finalValue = isNaN(parsed) ? 0 : parsed;

    setDraft(null);
    if (finalValue !== value) {
      onChange(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Escape") {
      setDraft(null);
    }
  };

  return (
    <div className={cn("flex items-center space-x-0 w-[150px]", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={value <= 0}
        className="h-10 w-10 rounded-r-none border-r-0"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <Input
        type="text"
        inputMode="numeric"
        value={draft ?? value}
        onChange={handleInputChange}
        onBlur={commitDraft}
        onKeyDown={handleKeyDown}
        className={cn(
          "h-10 w-full text-center p-0 appearance-none rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:z-10",
        )}
        style={{
          // Hide the default number input arrows/spinners in some browsers
          MozAppearance: "textfield",
          WebkitAppearance: "none",
        }}
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={max != null && value >= max}
        className="h-10 w-10 rounded-l-none border-l-0"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
