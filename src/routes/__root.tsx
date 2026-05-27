import {
	createRootRoute,
	type ErrorComponentProps,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/solid-router";
import { type JSX, Suspense } from "solid-js";
import { HydrationScript } from "solid-js/web";

import { AppProviders } from "../providers";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "NanaSplits" },
			{
				name: "description",
				content: "Telegram-native expense splitting powered by Convex.",
			},
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	component: RootComponent,
	errorComponent: RootErrorComponent,
	shellComponent: RootDocument,
});

function RootComponent() {
	return <Outlet />;
}

function RootErrorComponent(props: ErrorComponentProps) {
	const message = () =>
		props.error instanceof Error
			? props.error.message
			: "Something went wrong.";

	return (
		<main class="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12 text-gray-900 dark:bg-gray-950 dark:text-white">
			<div class="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-lg dark:bg-gray-900">
				<h1 class="font-semibold text-xl">Unable to load NanaSplits</h1>
				<p class="mt-3 text-gray-600 text-sm dark:text-gray-300">{message()}</p>
				<button
					class="mt-6 rounded-full bg-blue-600 px-5 py-2.5 font-semibold text-sm text-white transition hover:bg-blue-700"
					onClick={() => props.reset()}
					type="button"
				>
					Try again
				</button>
			</div>
		</main>
	);
}

function RootDocument(props: { children: JSX.Element }) {
	return (
		<html lang="en">
			<head>
				<HydrationScript />
				<HeadContent />
			</head>
			<body>
				<Suspense>
					<AppProviders>{props.children}</AppProviders>
				</Suspense>
				<Scripts />
			</body>
		</html>
	);
}
