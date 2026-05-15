import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, CreditCard, Shield, Users } from "lucide-react";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	return (
		<main className="min-h-screen bg-gradient-to-b from-yellow-50 via-white to-blue-50 text-gray-950 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:text-white">
			<section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
				<div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full bg-yellow-100 px-4 py-2 font-medium text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100">
					<Bot className="h-4 w-4" /> Telegram Mini App
				</div>
				<h1 className="max-w-3xl text-5xl font-black tracking-tight sm:text-7xl">
					Split expenses without leaving Telegram.
				</h1>
				<p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-gray-300">
					NanaSplits tracks group expenses, calculates balances by currency, and
					keeps the backend on Convex.
				</p>
				<div className="mt-10 flex flex-wrap gap-3">
					<Link
						className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
						to="/app"
					>
						Open Mini App
					</Link>
					<a
						className="rounded-full border border-gray-300 px-6 py-3 font-semibold transition hover:border-blue-500 dark:border-gray-700"
						href="https://t.me/"
					>
						Open Telegram
					</a>
				</div>
				<div className="mt-16 grid gap-4 sm:grid-cols-3">
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
	icon: React.ReactNode;
	title: string;
	text: string;
}) {
	return (
		<div className="rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70">
			<div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
				{icon}
			</div>
			<h2 className="font-bold">{title}</h2>
			<p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
				{text}
			</p>
		</div>
	);
}
