import { createFileRoute, Link } from "@tanstack/solid-router";
import { Bot, CreditCard, Shield, Users } from "lucide-solid";
import type { JSX } from "solid-js";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<main class="min-h-screen bg-slate-50 text-gray-950 dark:bg-gray-950 dark:text-white">
			<section class="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-12">
				<div class="mb-8 inline-flex w-fit items-center gap-2 rounded-sm border border-cyan-200 bg-white px-3 py-2 font-medium text-cyan-700 text-sm shadow-sm dark:border-cyan-900/70 dark:bg-gray-900 dark:text-cyan-300">
					<Bot class="h-4 w-4" /> Telegram Mini App
				</div>
				<h1 class="max-w-3xl font-semibold text-5xl tracking-tight sm:text-7xl">
					NanaSplits
				</h1>
				<p class="mt-5 max-w-2xl text-gray-600 text-lg leading-8 dark:text-gray-300">
					Split group expenses inside Telegram with clean balances, precise
					multi-currency totals, and simple settlement flows.
				</p>
				<div class="mt-10 flex flex-wrap gap-3">
					<Link
						class="rounded-sm bg-gray-950 px-5 py-3 font-semibold text-sm text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
						to="/app"
					>
						Open Mini App
					</Link>
					<a
						class="rounded-sm border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-800 text-sm transition hover:border-cyan-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
						href="https://t.me/"
					>
						Open Telegram
					</a>
				</div>
				<div class="mt-16 grid gap-3 sm:grid-cols-3">
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
	icon: JSX.Element;
	title: string;
	text: string;
}) {
	return (
		<div class="rounded-sm border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
			<div class="mb-4 flex h-9 w-9 items-center justify-center rounded-sm bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
				{icon}
			</div>
			<h2 class="font-semibold">{title}</h2>
			<p class="mt-2 text-gray-600 text-sm leading-6 dark:text-gray-400">
				{text}
			</p>
		</div>
	);
}
