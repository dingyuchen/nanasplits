import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { getConvexUrl } from "./env";

const convex = new ConvexReactClient(getConvexUrl(), {
	expectAuth: true,
});

export function AppProviders({ children }: { children: ReactNode }) {
	return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
