import { createFileRoute } from "@tanstack/react-router";
import { Bot, CreditCard, Shield, Users } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
	component: HomePage,
});

const MASTER_BOT_USERNAME = "nanasplits_bot";
const DEV_BOT_USERNAME = "bananasplits_bot";

function getTelegramBotUsername() {
	const deployTarget = import.meta.env.VITE_DEPLOY_TARGET;

	if (deployTarget === "master") {
		return MASTER_BOT_USERNAME;
	}

	if (deployTarget === "dev") {
		return DEV_BOT_USERNAME;
	}

	const publicBaseUrl =
		import.meta.env.VITE_PUBLIC_BASE_URL?.toLowerCase() ?? "";

	if (import.meta.env.DEV || publicBaseUrl.includes("dev")) {
		return DEV_BOT_USERNAME;
	}

	return MASTER_BOT_USERNAME;
}

function HomePage() {
	const telegramBotUsername = getTelegramBotUsername();
	const telegramBotLink = `https://t.me/${telegramBotUsername}`;
	const telegramMiniAppLink = `https://t.me/${telegramBotUsername}/app`;

	return (
		<main className="min-h-screen bg-slate-50 text-gray-950 dark:bg-gray-950 dark:text-white">
			<section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
				<div className="mb-8 inline-flex w-fit items-center gap-2 rounded-sm border border-cyan-200 bg-white px-3 py-2 font-medium text-cyan-700 text-sm shadow-sm dark:border-cyan-900/70 dark:bg-gray-900 dark:text-cyan-300">
					<Bot className="h-4 w-4" /> Telegram Mini App
				</div>
				<h1 className="max-w-3xl font-semibold text-5xl tracking-tight sm:text-7xl">
					NanaSplits
				</h1>
				<p className="mt-5 max-w-2xl text-gray-600 text-lg leading-8 dark:text-gray-300">
					Split group expenses inside Telegram with clean balances, precise
					multi-currency totals, and simple settlement flows.
				</p>
				<div className="mt-10 flex flex-wrap gap-3">
					<a
						className="rounded-sm bg-gray-950 px-5 py-3 font-semibold text-sm text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
						href={telegramMiniAppLink}
					>
						Open Mini App
					</a>
					<a
						className="rounded-sm border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 text-sm transition hover:border-cyan-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-cyan-500 dark:hover:bg-gray-800"
						href={telegramBotLink}
					>
						Open @{telegramBotUsername}
					</a>
				</div>
				<div className="mt-16 grid gap-3 sm:grid-cols-3">
					<Feature
						icon={<Users />}
						title="Groups"
						text="Use existing Telegram groups as expense rooms."
					/>
					<Feature
						icon={<CreditCard />}
						title="Balances"
						text="See who owes whom with multi-currency support."
					/>
					<Feature
						icon={<Shield />}
						title="Convex"
						text="Realtime data and auth stay on the existing Convex backend."
					/>
				</div>
			</section>
		</main>
	);
}

function Feature({
	icon,
	title,
	text,
}: {
	icon: ReactNode;
	title: string;
	text: string;
}) {
	return (
		<div className="rounded-sm border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
			<div className="mb-4 flex h-9 w-9 items-center justify-center rounded-sm bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
				{icon}
			</div>
			<h2 className="font-semibold">{title}</h2>
			<p className="mt-2 text-gray-600 text-sm leading-6 dark:text-gray-400">
				{text}
			</p>
		</div>
	);
}
