import { AlertCircle, ExternalLink, MessageSquare } from "lucide-solid";

export function TelegramRequiredPage() {
	return (
		<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 via-white to-blue-50 p-6 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			<div class="w-full max-w-md text-center">
				<div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
					<div class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500">
						<MessageSquare class="h-10 w-10 text-white" />
					</div>
					<h1 class="mb-3 text-3xl font-bold text-gray-900 dark:text-white">
						Open in Telegram
					</h1>
					<p class="mb-6 text-lg leading-relaxed text-gray-600 dark:text-gray-400">
						NanaSplits is a Telegram Mini App and can only be accessed from
						within Telegram.
					</p>
					<div class="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
						<div class="flex items-start gap-3">
							<AlertCircle class="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
							<div class="text-left">
								<p class="mb-1 text-sm font-medium text-blue-900 dark:text-blue-200">
									How to open:
								</p>
								<ol class="list-inside list-decimal space-y-1 text-sm text-blue-700 dark:text-blue-300">
									<li>Open Telegram on your device</li>
									<li>Navigate to the @nanasplits_bot</li>
									<li>Tap the menu button to launch the app</li>
								</ol>
							</div>
						</div>
					</div>
					<a
						class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/30 transition-all duration-300 hover:from-blue-600 hover:to-cyan-600"
						href="https://telegram.org/"
						rel="noopener noreferrer"
						target="_blank"
					>
						<span>Open Telegram</span>
						<ExternalLink class="h-4 w-4" />
					</a>
					<p class="mt-6 text-sm text-gray-500 dark:text-gray-400">
						Don't have Telegram?{" "}
						<a
							class="font-medium text-blue-600 hover:underline dark:text-blue-400"
							href="https://telegram.org/apps"
							rel="noopener noreferrer"
							target="_blank"
						>
							Download it here
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
