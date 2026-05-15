import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
	component: AppEntryPage,
});

function AppEntryPage() {
	return (
		<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 text-center dark:from-gray-900 dark:to-gray-800">
			<div className="max-w-sm rounded-3xl bg-white p-8 shadow-xl dark:bg-gray-800">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-3xl">
					🍌
				</div>
				<h1 className="text-2xl font-bold text-gray-950 dark:text-white">
					Open in Telegram
				</h1>
				<p className="mt-3 text-gray-600 dark:text-gray-300">
					NanaSplits needs Telegram launch data. Open the bot menu or Mini App
					button from Telegram so it can route you to your dashboard.
				</p>
			</div>
		</main>
	);
}
