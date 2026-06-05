import { useAuthActions } from "@convex-dev/auth/react";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useQuery as useTanStackQuery } from "@tanstack/react-query";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";

export { useAuthActions };
export { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export function useQuery<Query extends FunctionReference<"query">>(
	query: Query,
	args: FunctionArgs<Query>,
) {
	const result = useTanStackQuery(convexQuery(query, args));
	if (result.error) throw result.error;
	return () => result.data as FunctionReturnType<Query> | undefined;
}

export function useMutation<Mutation extends FunctionReference<"mutation">>(
	mutation: Mutation,
) {
	return useConvexMutation(mutation);
}
