import { splitProps, type JSX } from "solid-js";

import { cn } from "@/lib/utils";

export interface CurrencyInputProps extends Omit<
	JSX.InputHTMLAttributes<HTMLInputElement>,
	"value" | "onInput" | "type"
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
export function CurrencyInput(props: CurrencyInputProps) {
	const [local, inputProps] = splitProps(props, [
		"class",
		"value",
		"onValueChange",
		"maxCents",
		"readOnly",
	]);
	const maxCents = () => local.maxCents ?? 999999999999;

	const formatAmountDisplay = (amount: number): string => {
		const cents = Math.round(amount * 100);
		return (cents / 100).toFixed(2);
	};

	const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (
		event,
	) => {
		const digits = event.currentTarget.value.replace(/\D/g, "");
		const cents = Math.min(Number.parseInt(digits, 10) || 0, maxCents());
		local.onValueChange(cents / 100);
	};

	return (
		<input
			type="text"
			inputMode="numeric"
			pattern="[0-9]*\.[0-9]{2}"
			value={formatAmountDisplay(local.value)}
			onInput={handleInput}
			min="0.01"
			step="0.01"
			readOnly={local.readOnly}
			class={cn(
				"block min-w-0 grow py-3 pr-3 pl-1 text-base text-gray-900 dark:text-white",
				"bg-transparent placeholder:text-gray-400 focus:outline-none sm:text-sm/6",
				local.readOnly && "opacity-70",
				local.class,
			)}
			{...inputProps}
		/>
	);
}
