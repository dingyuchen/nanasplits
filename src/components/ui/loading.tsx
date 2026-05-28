import { Loader2 } from "lucide-solid";

export default function Loading({ message }: { message?: string }) {
	return (
		<div class="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-gray-950">
			<Loader2 class="mx-auto m-4 h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
			<p class="text-center text-gray-500 text-sm dark:text-gray-400">
				{message ?? "Loading..."}
			</p>
		</div>
	);
}
