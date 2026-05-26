import { splitProps, type JSX } from "solid-js";
import { cn } from "@/lib/utils";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "default" | "outline" | "ghost" | "destructive";
	size?: "default" | "sm" | "lg" | "icon";
}

export function Button(props: ButtonProps) {
	const [local, buttonProps] = splitProps(props, [
		"class",
		"variant",
		"size",
	]);
	const variant = () => local.variant ?? "default";
	const size = () => local.size ?? "default";

	return (
		<button
			class={cn(
				"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
				{
					"bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200":
						variant() === "default",
					"border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700":
						variant() === "outline",
					"hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100":
						variant() === "ghost",
					"bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600":
						variant() === "destructive",
					"h-10 px-4 py-2": size() === "default",
					"h-9 rounded-md px-3": size() === "sm",
					"h-11 rounded-md px-8": size() === "lg",
					"h-10 w-10": size() === "icon",
				},
				local.class,
			)}
			{...buttonProps}
		/>
	);
}
