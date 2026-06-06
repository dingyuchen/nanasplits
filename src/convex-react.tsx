import { useAuthActions } from "@convex-dev/auth/react";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery as useTanStackQuery } from "@tanstack/react-query";
import type { FunctionArgs, FunctionReference } from "convex/server";

export { useAuthActions };
export { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export function useQuery<Query extends FunctionReference<"query">>(
	query: Query,
	args: FunctionArgs<Query>,
) {
	return useTanStackQuery(convexQuery(query, args));
}
