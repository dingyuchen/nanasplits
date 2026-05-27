import { Loader2 } from "lucide-solid";

export default function Loading({ message }: { message?: string }) {
	return (
		<div class="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
			<Loader2 class="mx-auto m-4 h-12 w-12 animate-spin text-blue-500" />
			<p class="text-center text-gray-600 dark:text-gray-400">
				{message ?? "Loading..."}
			</p>
		</div>
	);
}
