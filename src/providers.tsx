import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

export function AppProviders(props: {
	children: ReactNode;
	convexClient: ConvexReactClient;
}) {
	return (
		<ConvexAuthProvider client={props.convexClient}>
			{props.children}
		</ConvexAuthProvider>
	);
}
