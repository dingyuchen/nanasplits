"use client";

import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  /** The amount value in dollars (e.g., 12.34) */
  value: number;
  /** Callback when the amount changes, receives value in dollars */
  onValueChange: (value: number) => void;
  /** Maximum value in cents to prevent overflow */
  maxCents?: number;
}

/**
 * ATM-style currency input that treats input as cents.
 * Digits are appended to the end and the decimal point moves automatically.
 *
 * Example: typing "1" → "0.01", "12" → "0.12", "123" → "1.23"
 */
export function CurrencyInput({
  value,
  onValueChange,
  maxCents = 999999999999,
  className,
  readOnly,
  ...props
}: CurrencyInputProps) {
  // Format amount for ATM-style display (always 2 decimal places)
  const formatAmountDisplay = (amt: number): string => {
    const cents = Math.round(amt * 100);
    return (cents / 100).toFixed(2);
  };

  // ATM-style input handler: treats input as cents and moves decimal automatically
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Extract only digits from input
    const digits = inputValue.replace(/\D/g, "");
    // Convert to cents then to dollars
    const cents = Math.min(parseInt(digits, 10) || 0, maxCents);
    const dollars = cents / 100;
    onValueChange(dollars);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*\.[0-9]{2}"
      value={formatAmountDisplay(value)}
      onChange={handleChange}
      min="0.01"
      step="0.01"
      readOnly={readOnly}
      className={cn(
        "block min-w-0 grow py-3 pr-3 pl-1 text-base text-gray-900 dark:text-white",
        "placeholder:text-gray-400 focus:outline-none bg-transparent sm:text-sm/6",
        readOnly && "opacity-70",
        className,
      )}
      {...props}
    />
  );
}
