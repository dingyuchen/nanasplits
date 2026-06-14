import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { getConvexUrl } from "#/env";
import { routeTree } from "#/routeTree.gen";

export function getRouter() {
	const convexQueryClient = new ConvexQueryClient(getConvexUrl());
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryFn: convexQueryClient.queryFn(),
				queryKeyHashFn: convexQueryClient.hashFn(),
			},
		},
	});
	convexQueryClient.connect(queryClient);

	const router = createTanStackRouter({
		context: {
			convexClient: convexQueryClient.convexClient,
			queryClient,
		},
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({
		queryClient,
		router,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
