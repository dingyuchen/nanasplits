import { query } from "./_generated/server";
import { v } from "convex/values";

export const getGroupsByUser = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		// Note: Convex doesn't support array.includes() in filters
		// We fetch all groups and filter in JavaScript
		const allGroups = await ctx.db.query("groups").collect();
		return allGroups.filter((group) => group.memberIds.includes(args.userId));
	},
});

export const getGroupsWithPendingSplits = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		// Return dummy data
		return [
			{
				_id: "j123456789" as any,
				_creationTime: Date.now() - 86400000,
				telegramChatId: "-1001234567890",
				name: "Trip to Tokyo",
				memberIds: [args.userId, "987654321", "456789123"],
				createdBy: args.userId,
				stats: {
					totalOwed: 125.50,
					totalOwedToMe: 50.00,
					netAmount: -75.50,
					pendingSplitsCount: 3,
					pendingExpensesCount: 2,
				},
			},
			{
				_id: "j987654321" as any,
				_creationTime: Date.now() - 172800000,
				telegramChatId: "-1009876543210",
				name: "Weekend Dinner",
				memberIds: [args.userId, "987654321"],
				createdBy: "987654321",
				stats: {
					totalOwed: 0,
					totalOwedToMe: 39.25,
					netAmount: 39.25,
					pendingSplitsCount: 2,
					pendingExpensesCount: 1,
				},
			},
		];
	},
});

export const getOverallStats = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		// Return dummy data
		return {
			totalOwed: 125.50,
			totalOwedToMe: 89.25,
			netAmount: -36.25,
			totalPendingSplits: 5,
			totalPendingExpenses: 3,
			groupsWithPendingSplits: 2,
		};
	},
});
