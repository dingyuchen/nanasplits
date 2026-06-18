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
		links: [
			{ rel: "preconnect", href: "https://fonts.googleapis.com" },
			{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:opsz@36&family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
		],
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
		<main className="flex min-h-screen items-center justify-center bg-stone-50 px-6 py-12 text-stone-900">
			<div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
				<h1 className="font-serif font-medium tracking-tight text-2xl">
					Unable to load NanaSplits
				</h1>
				<p className="mt-3 text-stone-500 text-sm">{message}</p>
				<button
					className="mt-6 rounded-lg bg-sky-500 px-5 py-2.5 font-semibold text-sm text-white transition hover:bg-sky-600"
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
