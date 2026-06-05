import { AlertCircle, ExternalLink, MessageSquare } from "lucide-react";

export function TelegramRequiredPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-gray-950">
			<div className="w-full max-w-md text-center">
				<div className="rounded-sm border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-sm bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
						<MessageSquare className="h-7 w-7" />
					</div>
					<h1 className="mb-3 font-semibold text-3xl tracking-tight text-gray-900 dark:text-white">
						Open in Telegram
					</h1>
					<p className="mb-6 leading-7 text-gray-600 dark:text-gray-400">
						NanaSplits is a Telegram Mini App and can only be accessed from
						within Telegram.
					</p>
					<div className="mb-6 rounded-sm border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-900/70 dark:bg-cyan-950/30">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700 dark:text-cyan-300" />
							<div className="text-left">
								<p className="mb-1 font-medium text-cyan-950 text-sm dark:text-cyan-200">
									How to open:
								</p>
								<ol className="list-inside list-decimal space-y-1 text-cyan-800 text-sm dark:text-cyan-300">
									<li>Open Telegram on your device</li>
									<li>Navigate to the @nanasplits_bot</li>
									<li>Tap the menu button to launch the app</li>
								</ol>
							</div>
						</div>
					</div>
					<a
						className="inline-flex items-center justify-center gap-2 rounded-sm bg-gray-950 px-5 py-3 font-semibold text-sm text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
						href="https://telegram.org/"
						rel="noopener noreferrer"
						target="_blank"
					>
						<span>Open Telegram</span>
						<ExternalLink className="h-4 w-4" />
					</a>
					<p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
						Don't have Telegram?{" "}
						<a
							className="font-medium text-cyan-700 hover:underline dark:text-cyan-300"
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
