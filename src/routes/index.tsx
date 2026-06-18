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
		<main className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
			<nav className="flex items-center justify-between border-stone-200 border-b px-6 py-5">
				<div className="font-serif font-medium tracking-tight text-stone-900 text-xl">
					Nana<span className="text-sky-500">Splits</span>
				</div>
				<span className="inline-flex items-center rounded-full bg-stone-100 px-3.5 py-1 font-medium text-stone-500 text-xs tracking-tight">
					Telegram
				</span>
			</nav>
			<section className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-7xl flex-col justify-center px-6 py-12 sm:py-16">
				<div className="inline-flex w-fit items-center gap-2 rounded-full bg-sky-50 px-4 py-1.5 font-medium text-sky-500 text-sm">
					<Bot className="h-4 w-4" /> Telegram Mini App
				</div>
				<h1 className="font-serif font-medium tracking-tight mt-8 max-w-[14ch] text-[clamp(2.75rem,8vw,5rem)] text-stone-900 leading-[1.05]">
					Clear accounts,
					<br />
					<span className="text-sky-500">quiet minds.</span>
				</h1>
				<p className="mt-5 max-w-2xl text-stone-500 text-lg leading-8">
					Expense splitting for groups who value clarity. Multi-currency
					balances and simple settlements, all inside Telegram.
				</p>
				<div className="mt-10 flex flex-wrap gap-3">
					<a
						className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-6 py-3 font-semibold text-sm text-white tracking-tight transition hover:bg-sky-600"
						href={telegramMiniAppLink}
					>
						Open Mini App
					</a>
					<a
						className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-transparent px-6 py-3 font-semibold text-stone-900 text-sm tracking-tight transition hover:border-sky-500 hover:text-sky-500"
						href={telegramBotLink}
					>
						Open @{telegramBotUsername}
					</a>
				</div>
				<div className="mt-16 grid border border-stone-200 bg-stone-200 sm:grid-cols-3">
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
		<div className="bg-stone-50 p-6">
			<div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-500 [&>svg]:h-5 [&>svg]:w-5">
				{icon}
			</div>
			<h2 className="font-serif font-medium tracking-tight text-stone-900 text-xl">
				{title}
			</h2>
			<p className="mt-1.5 text-stone-500 text-sm leading-7">{text}</p>
		</div>
	);
}
