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
		// Get all groups and filter to those the user is a member of
		const allGroups = await ctx.db.query("groups").collect();
		const groups = allGroups.filter((group) =>
			group.memberIds.includes(args.userId),
		);

		// For each group, calculate pending splits stats
		const groupsWithStats = await Promise.all(
			groups.map(async (group) => {
				// Get all unsettled splits for this group
				const pendingSplits = await ctx.db
					.query("splits")
					.withIndex("groupId", (q) => q.eq("groupId", group._id))
					.filter((q) => q.eq(q.field("settled"), false))
					.collect();

				// Calculate totals
				const totalOwed = pendingSplits
					.filter((split) => split.fromUserId === args.userId)
					.reduce((sum, split) => sum + split.amount, 0);

				const totalOwedToMe = pendingSplits
					.filter((split) => split.toUserId === args.userId)
					.reduce((sum, split) => sum + split.amount, 0);

				const netAmount = totalOwedToMe - totalOwed;

				// Get pending expenses count
				const pendingExpenses = await ctx.db
					.query("expenses")
					.withIndex("groupId", (q) => q.eq("groupId", group._id))
					.filter((q) => q.eq(q.field("settled"), false))
					.collect();

				return {
					...group,
					stats: {
						totalOwed,
						totalOwedToMe,
						netAmount,
						pendingSplitsCount: pendingSplits.length,
						pendingExpensesCount: pendingExpenses.length,
					},
				};
			}),
		);

		// Filter to only groups with pending splits
		return groupsWithStats.filter(
			(group) => group.stats.pendingSplitsCount > 0,
		);
	},
});

export const getOverallStats = query({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		// Get all groups and filter to those the user is a member of
		const allGroups = await ctx.db.query("groups").collect();
		const groups = allGroups.filter((group) =>
			group.memberIds.includes(args.userId),
		);

		let totalOwed = 0;
		let totalOwedToMe = 0;
		let totalPendingSplits = 0;
		let totalPendingExpenses = 0;

		for (const group of groups) {
			const pendingSplits = await ctx.db
				.query("splits")
				.withIndex("groupId", (q) => q.eq("groupId", group._id))
				.filter((q) => q.eq(q.field("settled"), false))
				.collect();

			const pendingExpenses = await ctx.db
				.query("expenses")
				.withIndex("groupId", (q) => q.eq("groupId", group._id))
				.filter((q) => q.eq(q.field("settled"), false))
				.collect();

			totalPendingSplits += pendingSplits.length;
			totalPendingExpenses += pendingExpenses.length;

			totalOwed += pendingSplits
				.filter((split) => split.fromUserId === args.userId)
				.reduce((sum, split) => sum + split.amount, 0);

			totalOwedToMe += pendingSplits
				.filter((split) => split.toUserId === args.userId)
				.reduce((sum, split) => sum + split.amount, 0);
		}

		return {
			totalOwed,
			totalOwedToMe,
			netAmount: totalOwedToMe - totalOwed,
			totalPendingSplits,
			totalPendingExpenses,
			groupsWithPendingSplits: groups.length,
		};
	},
});
