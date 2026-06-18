import { LoaderCircle } from "lucide-react";

export default function Loading({ message }: { message?: string }) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 p-6">
			<LoaderCircle className="mx-auto m-4 h-8 w-8 animate-spin text-sky-500" />
			<p className="text-center text-stone-500 text-sm">
				{message ?? "Loading..."}
			</p>
		</div>
	);
}
