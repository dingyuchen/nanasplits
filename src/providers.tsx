import type { JSX } from "solid-js";
import { getConvexUrl } from "./env";
import { SolidConvexProvider } from "./solid-convex";

export function AppProviders(props: { children: JSX.Element }) {
	return (
		<SolidConvexProvider convexUrl={getConvexUrl()}>
			{props.children}
		</SolidConvexProvider>
	);
}
