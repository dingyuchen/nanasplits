import { getAuthUserId } from "@convex-dev/auth/server";
import {
	customQuery,
	customMutation,
	customCtx,
	customCtxAndArgs,
} from "convex-helpers/server/customFunctions";
import { v } from "convex/values";

import { getServerEnv } from "#/env";

import { query, mutation } from "../_generated/server";

const trustedCtx = customCtxAndArgs({
	args: {
		trustedSecret: v.string(),
	},
	input: async (_ctx, args) => {
		if (args.trustedSecret !== getServerEnv("TELEGRAM_BOT_SECRET_TOKEN")) {
			throw new Error("Unauthorized: Invalid trusted secret");
		}
		return { ctx: {}, args: {} };
	},
});

export const protectedQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new Error("Unauthorized: User is not authenticated");
		}
		return { userId };
	}),
);

export const trustedQuery = customQuery(query, trustedCtx);

export const protectedMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			throw new Error("Unauthorized: User is not authenticated");
		}
		return { userId };
	}),
);

export const trustedMutation = customMutation(mutation, trustedCtx);
