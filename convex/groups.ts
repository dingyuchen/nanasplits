import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get overall statistics for a user
 * Returns summary of expenses, debts, and pending splits
 */
export const getOverallStats = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Stub: Return hardcoded dummy data
		return {
			totalOwed: 125.50,
			totalOwedToMe: 85.25,
			netAmount: -40.25, // negative means user owes more than owed to them
			totalPendingExpenses: 7,
			groupsWithPendingSplits: 3,
		};
	},
});

/**
 * Get groups with pending splits for a user
 * Returns list of groups where user has pending expense splits
 */
export const getGroupsWithPendingSplits = query({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Stub: Return hardcoded dummy data
		return [
			{
				_id: "group1" as any,
				name: "Weekend Trip",
				memberIds: ["user1", "user2", "user3", "user4"],
				stats: {
					pendingSplitsCount: 3,
					totalOwed: 75.50,
					totalOwedToMe: 45.25,
					netAmount: -30.25,
				},
			},
			{
				_id: "group2" as any,
				name: "Apartment Rent",
				memberIds: ["user1", "user2", "user3"],
				stats: {
					pendingSplitsCount: 2,
					totalOwed: 40.00,
					totalOwedToMe: 30.00,
					netAmount: -10.00,
				},
			},
			{
				_id: "group3" as any,
				name: "Office Lunch",
				memberIds: ["user1", "user2", "user3", "user4", "user5"],
				stats: {
					pendingSplitsCount: 2,
					totalOwed: 10.00,
					totalOwedToMe: 10.00,
					netAmount: 0,
				},
			},
		];
	},
});

