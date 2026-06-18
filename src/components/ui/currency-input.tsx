import type { FormEvent, InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface CurrencyInputProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	"value" | "onInput" | "onChange" | "type"
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
 * Example: typing "1" -> "0.01", "12" -> "0.12", "123" -> "1.23"
 */
export function CurrencyInput({
	className,
	maxCents = 999999999999,
	onValueChange,
	readOnly,
	value,
	...inputProps
}: CurrencyInputProps) {
	const formatAmountDisplay = (amount: number): string => {
		const cents = Math.round(amount * 100);
		return (cents / 100).toFixed(2);
	};

	const handleInput = (event: FormEvent<HTMLInputElement>) => {
		const digits = event.currentTarget.value.replace(/\D/g, "");
		const cents = Math.min(Number.parseInt(digits, 10) || 0, maxCents);
		onValueChange(cents / 100);
	};

	return (
		<input
			type="text"
			inputMode="numeric"
			pattern="[0-9]*\.[0-9]{2}"
			value={formatAmountDisplay(value)}
			onInput={handleInput}
			min="0.01"
			step="0.01"
			readOnly={readOnly}
			className={cn(
				"block min-w-0 grow py-3 pr-3 pl-1 text-base text-stone-900",
				"bg-transparent placeholder:text-stone-400 focus:outline-none sm:text-sm/6",
				readOnly && "opacity-70",
				className,
			)}
			{...inputProps}
		/>
	);
}
