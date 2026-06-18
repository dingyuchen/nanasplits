import { AlertCircle, ExternalLink, MessageSquare } from "lucide-react";

export function TelegramRequiredPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-stone-50 p-6 text-stone-900">
			<div className="w-full max-w-md text-center">
				<div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
					<div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
						<MessageSquare className="h-7 w-7" />
					</div>
					<h1 className="font-heading mb-3 text-3xl text-stone-900">
						Open in Telegram
					</h1>
					<p className="mb-6 leading-7 text-stone-500">
						NanaSplits is a Telegram Mini App and can only be accessed from
						within Telegram.
					</p>
					<div className="mb-6 rounded-lg border border-sky-100 bg-sky-50 p-4">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
							<div className="text-left">
								<p className="mb-1 font-semibold text-stone-900 text-sm">
									How to open:
								</p>
								<ol className="list-inside list-decimal space-y-1 text-stone-500 text-sm">
									<li>Open Telegram on your device</li>
									<li>Navigate to the @nanasplits_bot</li>
									<li>Tap the menu button to launch the app</li>
								</ol>
							</div>
						</div>
					</div>
					<a
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 py-3 font-semibold text-sm text-white transition hover:bg-sky-600"
						href="https://telegram.org/"
						rel="noopener noreferrer"
						target="_blank"
					>
						<span>Open Telegram</span>
						<ExternalLink className="h-4 w-4" />
					</a>
					<p className="mt-6 text-stone-500 text-sm">
						Don't have Telegram?{" "}
						<a
							className="font-medium text-sky-500 hover:underline"
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
