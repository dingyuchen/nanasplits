import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	type ErrorComponentProps,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ConvexReactClient } from "convex/react";
import { Suspense, type ReactNode } from "react";

import { AppProviders } from "#/providers";

import appCss from "#/styles.css?url";

export const Route = createRootRouteWithContext<{
	convexClient: ConvexReactClient;
	queryClient: QueryClient;
}>()({
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
	const message =
		props.error instanceof Error
			? props.error.message
			: "Something went wrong.";

	return (
		<main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12 text-gray-900 dark:bg-gray-950 dark:text-white">
			<div className="w-full max-w-sm rounded-sm border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<h1 className="font-semibold text-xl">Unable to load NanaSplits</h1>
				<p className="mt-3 text-gray-600 text-sm dark:text-gray-300">
					{message}
				</p>
				<button
					className="mt-6 rounded-sm bg-gray-950 px-5 py-2.5 font-semibold text-sm text-white transition hover:bg-gray-800 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
					onClick={() => props.reset()}
					type="button"
				>
					Try again
				</button>
			</div>
		</main>
	);
}

function RootDocument(props: { children: ReactNode }) {
	const { convexClient } = Route.useRouteContext();

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Suspense>
					<AppProviders convexClient={convexClient}>
						{props.children}
					</AppProviders>
				</Suspense>
				<Scripts />
			</body>
		</html>
	);
}
