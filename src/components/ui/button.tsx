import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "default" | "outline" | "ghost" | "destructive";
	size?: "default" | "sm" | "lg" | "icon";
}

export function Button({
	className,
	size = "default",
	variant = "default",
	...buttonProps
}: ButtonProps) {
	return (
		<button
			className={cn(
				"inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold tracking-[-0.01em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
				{
					"bg-sky-500 text-white hover:bg-sky-600": variant === "default",
					"border border-stone-200 bg-white text-stone-900 hover:border-sky-500 hover:text-sky-500":
						variant === "outline",
					"text-stone-500 hover:bg-stone-100 hover:text-stone-900":
						variant === "ghost",
					"bg-red-600 text-white hover:bg-red-700": variant === "destructive",
					"h-10 px-4 py-2": size === "default",
					"h-9 px-3": size === "sm",
					"h-11 px-8": size === "lg",
					"h-10 w-10": size === "icon",
				},
				className,
			)}
			{...buttonProps}
		/>
	);
}
