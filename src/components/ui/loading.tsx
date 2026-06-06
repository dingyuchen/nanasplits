import { LoaderCircle } from "lucide-react";

export default function Loading({ message }: { message?: string }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 dark:bg-gray-950">
			<LoaderCircle className="mx-auto m-4 h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
			<p className="text-center text-gray-500 text-sm dark:text-gray-400">
				{message ?? "Loading..."}
			</p>
		</div>
	);
}
