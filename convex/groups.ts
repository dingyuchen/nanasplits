import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { DatabaseReader, DatabaseWriter } from "./_generated/server";
import {
	protectedMutation,
	protectedQuery,
	trustedMutation,
} from "./lib/utils";
import { ExpenseType } from "./schema";

/** Shared validator for expense items */
const expenseItemsValidator = v.array(
	v.object({
		name: v.string(),
		amount: v.number(),
		splits: v.array(
			v.object({
				userId: v.id("users"),
				amount: v.number(),
			}),
		),
	}),
);

type ExpenseItem = {
	name: string;
	amount: number;
	splits: { userId: Id<"users">; amount: number }[];
};

function normalizeCurrencyCode(currency: string) {
	const code = currency.trim().toUpperCase();
	if (!/^[A-Z]{3}$/.test(code)) {
		throw new Error("Currency must be a 3-letter ISO code");
	}
	return code;
}

function roundMoney(amount: number) {
	return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function normalizeExpenseTag(tag: string | null | undefined) {
	if (tag === null || tag === undefined) return null;
	const trimmed = tag.trim();
	if (trimmed.length === 0) return null;
	if (trimmed.length > 32) {
		throw new Error("Tag must be 32 characters or less");
	}
	return trimmed;
}

/**
 * Validates expense participants and returns the group with member IDs
 */
async function getGroupWithParticipantValidation(
	db: DatabaseReader | DatabaseWriter,
	args: {
		telegramChatId: number;
		telegramUserId: number;
		payerId: Id<"users">;
		items: ExpenseItem[];
	},
	userId: Id<"users">,
): Promise<{ group: Doc<"groups">; memberIds: Set<Id<"users">> }> {
	// Check user match
	const user = await db.get(userId);
	if (!user || user.telegramUserId !== args.telegramUserId) {
		throw new Error("User mismatch");
	}

	// Find the group by Telegram chat ID
	const group = await db
		.query("groups")
		.withIndex("by_telegram_chat_id", (q) =>
			q.eq("telegramChatId", args.telegramChatId),
		)
		.first();

	if (!group) {
		throw new Error("Group not found");
	}

	// Get all group members to validate participants
	const groupMembers = await db
		.query("group_members")
		.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
		.collect();
	const memberIds = new Set(groupMembers.map((m) => m.userId));

	// Check if the user is a member of the group
	if (!memberIds.has(userId)) {
		throw new Error("User is not a member of this group");
	}
	// Check if the payer is a member of the group
	if (!memberIds.has(args.payerId)) {
		throw new Error("Payer is not a member of this group");
	}
	// Check if all split users are members of the group
	for (const item of args.items) {
		for (const split of item.splits) {
			if (!memberIds.has(split.userId)) {
				throw new Error(
					`Split user ${split.userId} is not a member of this group`,
				);
			}
		}
	}

	return { group, memberIds };
}

/**
 * Create or get a group by Telegram chat ID
 * Used when the bot is added to a Telegram group
 */
export const createOrGetGroupByChatId = trustedMutation({
	args: {
		telegramChatId: v.number(),
		title: v.string(),
		telegramChatType: v.string(),
		isForum: v.boolean(),
	},
	handler: async (ctx, args) => {
		// Check if group already exists
		const existingGroup = await ctx.db
			.query("groups")
			.withIndex("by_telegram_chat_id", (q) =>
				q.eq("telegramChatId", args.telegramChatId),
			)
			.first();

		if (existingGroup) {
			return existingGroup._id;
		}

		// Create new group
		const groupId = await ctx.db.insert("groups", {
			title: args.title,
			telegramChatType: args.telegramChatType,
			isForum: args.isForum,
			telegramChatId: args.telegramChatId,
			defaultCurrency: "USD",
		});

		return groupId;
	},
});

/**
 * Update a group's Telegram chat ID after Telegram migrates a basic group to a
 * supergroup. Called by the bot webhook when migration service messages arrive.
 */
export const migrateGroupTelegramChatId = trustedMutation({
	args: {
		oldTelegramChatId: v.number(),
		newTelegramChatId: v.number(),
		title: v.optional(v.string()),
		telegramChatType: v.string(),
		isForum: v.boolean(),
	},
	handler: async (ctx, args) => {
		if (args.oldTelegramChatId === args.newTelegramChatId) {
			throw new Error("Migration chat IDs must be different");
		}

		const oldGroup = await ctx.db
			.query("groups")
			.withIndex("by_telegram_chat_id", (q) =>
				q.eq("telegramChatId", args.oldTelegramChatId),
			)
			.unique();

		if (!oldGroup) {
			throw new Error("Group not found for Telegram migration");
		}

		await ctx.db.patch(oldGroup._id, {
			telegramChatId: args.newTelegramChatId,
			title: args.title ?? oldGroup.title,
			telegramChatType: args.telegramChatType,
			isForum: args.isForum,
		});

		return oldGroup._id;
	},
});

/**
 * Check if a user is a member of a group
 */
export const isUserMemberOfGroup = protectedQuery({
	args: {
		telegramChatId: v.number(),
		telegramUserId: v.number(),
	},
	handler: async (ctx, args) => {
		// Check user match
		const user = await ctx.db.get(ctx.userId);
		if (!user || user.telegramUserId !== args.telegramUserId) {
			throw new Error("User mismatch");
		}

		// Find the group by Telegram chat ID
		const group = await ctx.db
			.query("groups")
			.withIndex("by_telegram_chat_id", (q) =>
				q.eq("telegramChatId", args.telegramChatId),
			)
			.first();

		if (!group) {
			return false;
		}

		// Check if the user is a member of the group
		const membership = await ctx.db
			.query("group_members")
			.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
			.filter((q) => q.eq(q.field("userId"), ctx.userId))
			.first();

		return membership !== null;
	},
});

/**
 * Get dashboard data for a user
 * Returns overall stats, groups with pending splits, and balances by currency
 * All data is calculated in a single pass for efficiency
 */
export const getDashboardData = protectedQuery({
	args: {
		userId: v.number(),
	},
	handler: async (ctx, args) => {
		// Check user match
		const user = await ctx.db.get(ctx.userId);
		if (!user || user.telegramUserId !== args.userId) {
			throw new Error("User mismatch");
		}

		const currentUserId = ctx.userId;

		// Get all groups the user is a member of
		const memberships = await ctx.db
			.query("group_members")
			.withIndex("by_user_id", (q) => q.eq("userId", currentUserId))
			.collect();

		// Currency balances structure
		const currencyBalances: Record<
			string,
			{
				netBalance: number;
				memberBalances: Record<
					string,
					{ memberId: Id<"users">; memberName: string; balance: number }
				>;
			}
		> = {};

		// Cache for user lookups
		const userCache: Record<string, { firstName?: string; username?: string }> =
			{};

		const getUser = async (userId: Id<"users">) => {
			if (!(userId in userCache)) {
				const u = await ctx.db.get(userId);
				userCache[userId] = u || {};
			}
			return userCache[userId];
		};

		// Helper to get or create currency data
		const getOrCreateCurrency = (currency: string) => {
			if (!(currency in currencyBalances)) {
				currencyBalances[currency] = { netBalance: 0, memberBalances: {} };
			}
			return currencyBalances[currency];
		};

		// Helper to get or create member balance within a currency
		const getOrCreateMemberBalance = async (
			currencyData: (typeof currencyBalances)[string],
			memberId: Id<"users">,
		) => {
			if (!(memberId in currencyData.memberBalances)) {
				const member = await getUser(memberId);
				currencyData.memberBalances[memberId] = {
					memberId,
					memberName: member?.firstName || member?.username || "Unknown",
					balance: 0,
				};
			}
			return currencyData.memberBalances[memberId];
		};

		// Groups with pending splits
		const groupsWithStats: Array<{
			_id: Id<"groups">;
			name: string;
			telegramChatId: number;
			memberIds: Id<"users">[];
			stats: {
				currency: string;
				totalOwed: number;
				totalOwedToMe: number;
				netAmount: number;
			}[];
		}> = [];

		// Fetch all group data in parallel
		const groupDataResults = await Promise.all(
			memberships.map(async (membership) => {
				const group = await ctx.db.get(membership.groupId);
				if (!group) return null;

				// Fetch members and expenses in parallel for each group
				const [groupMembers, expenses] = await Promise.all([
					ctx.db
						.query("group_members")
						.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
						.collect(),
					ctx.db
						.query("expenses")
						.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
						.collect(),
				]);

				return { group, groupMembers, expenses };
			}),
		);

		// Process all groups (sequential to update shared state)
		for (const groupData of groupDataResults) {
			if (!groupData) continue;

			const { group, groupMembers, expenses } = groupData;

			// Track stats per currency for this group
			const groupCurrencyStats: Record<
				string,
				{ totalOwed: number; totalOwedToMe: number }
			> = {};

			const getOrCreateGroupCurrencyStats = (currency: string) => {
				if (!(currency in groupCurrencyStats)) {
					groupCurrencyStats[currency] = { totalOwed: 0, totalOwedToMe: 0 };
				}
				return groupCurrencyStats[currency];
			};

			for (const expense of expenses) {
				const isCurrentUserPayer = expense.payerId === currentUserId;
				const currency = expense.currency;
				const currencyData = getOrCreateCurrency(currency);
				const groupStats = getOrCreateGroupCurrencyStats(currency);

				for (const item of expense.items) {
					for (const split of item.splits) {
						const splitUserId = split.userId;
						const amount = split.amount;

						if (isCurrentUserPayer) {
							// Current user paid - others owe current user
							if (splitUserId !== currentUserId) {
								groupStats.totalOwedToMe += amount;

								// Update currency balance
								currencyData.netBalance += amount;
								const memberBalance = await getOrCreateMemberBalance(
									currencyData,
									splitUserId,
								);
								memberBalance.balance += amount;
							}
						} else if (splitUserId === currentUserId) {
							// Current user owes the payer
							groupStats.totalOwed += amount;

							// Update currency balance
							currencyData.netBalance -= amount;
							const memberBalance = await getOrCreateMemberBalance(
								currencyData,
								expense.payerId,
							);
							memberBalance.balance -= amount;
						}
					}
				}
			}

			// Convert group currency stats to array and filter non-zero balances
			const stats = Object.entries(groupCurrencyStats)
				.map(([currency, { totalOwed, totalOwedToMe }]) => ({
					currency,
					totalOwed,
					totalOwedToMe,
					netAmount: totalOwedToMe - totalOwed,
				}))
				.filter((s) => s.netAmount !== 0);

			// Add group to list if it has pending splits in any currency
			if (stats.length > 0) {
				groupsWithStats.push({
					_id: group._id,
					name: group.title,
					telegramChatId: group.telegramChatId,
					memberIds: groupMembers.map((m) => m.userId),
					stats,
				});
			}
		}

		// Convert currency balances to array format
		const balancesByCurrency = Object.entries(currencyBalances).map(
			([currency, data]) => ({
				currency,
				netBalance: data.netBalance,
				memberBalances: Object.values(data.memberBalances).filter(
					(m) => m.balance !== 0,
				),
			}),
		);

		return {
			stats: {
				groupsWithPendingSplits: groupsWithStats.length,
			},
			groupsWithPendingSplits: groupsWithStats,
			balancesByCurrency,
		};
	},
});

export const getGroupByChatId = protectedQuery({
	args: {
		telegramChatId: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("groups")
			.withIndex("by_telegram_chat_id", (q) =>
				q.eq("telegramChatId", args.telegramChatId),
			)
			.unique();
	},
});

/**
 * Get a group by Telegram chat ID
 */
export const getListOfExpenses = protectedQuery({
	args: {
		telegramChatId: v.number(),
	},
	handler: async (ctx, args) => {
		const group = await ctx.db
			.query("groups")
			.withIndex("by_telegram_chat_id", (q) =>
				q.eq("telegramChatId", args.telegramChatId),
			)
			.unique();

		if (!group) return null;

		// Reuse the same logic as getGroup to fetch members, expenses, and stats
		// Fetch members
		const groupMembers = await ctx.db
			.query("group_members")
			.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
			.collect();

		const members = await Promise.all(
			groupMembers.map((member) => ctx.db.get(member.userId)),
		);

		// Fetch expenses
		const expenses = await ctx.db
			.query("expenses")
			.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
			.order("desc")
			.collect();

		// Join payer info into expenses
		const expensesWithPayer = await Promise.all(
			expenses.map(async (expense) => {
				const payer = await ctx.db.get(expense.payerId);
				return {
					...expense,
					payerName:
						payer?.firstName ?? payer?.lastName ?? payer?.username ?? "Unnamed",
					payerTelegramUserId: payer?.telegramUserId ?? null,
				};
			}),
		);

		// Calculate basic stats
		const totalExpenses = expenses.reduce(
			(sum, exp) => sum + exp.items.reduce((sum, item) => sum + item.amount, 0),
			0,
		);

		return {
			...group,
			members: members.filter((m) => m !== null),
			expenses: expensesWithPayer,
			totalExpenses,
			memberCount: members.length,
		};
	},
});

/**
 * Add a user to a group
 */
export const addUserToGroup = protectedMutation({
	args: {
		telegramChatId: v.number(),
		telegramUserId: v.number(),
	},
	handler: async (ctx, args) => {
		// Check user match
		const user = await ctx.db.get(ctx.userId);
		if (!user || user.telegramUserId !== args.telegramUserId) {
			throw new Error("User mismatch");
		}

		// Find the group by Telegram chat ID
		const group = await ctx.db
			.query("groups")
			.withIndex("by_telegram_chat_id", (q) =>
				q.eq("telegramChatId", args.telegramChatId),
			)
			.first();

		if (!group) {
			throw new Error("Group not found");
		}

		const userId = ctx.userId;

		// Check if the user is already a member
		const existingMembership = await ctx.db
			.query("group_members")
			.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
			.filter((q) => q.eq(q.field("userId"), userId))
			.first();

		if (existingMembership) {
			return existingMembership._id;
		}

		// Add the user to the group
		const membershipId = await ctx.db.insert("group_members", {
			groupId: group._id,
			userId: userId,
		});

		return membershipId;
	},
});

/**
 * Add an expense to a group
 */
export const addExpense = protectedMutation({
	args: {
		telegramChatId: v.number(),
		telegramUserId: v.number(),
		payerId: v.id("users"),
		currency: v.string(),
		description: v.string(),
		tag: v.optional(v.union(v.string(), v.null())),
		date: v.number(),
		items: expenseItemsValidator,
	},
	handler: async (ctx, args) => {
		const { group } = await getGroupWithParticipantValidation(
			ctx.db,
			args,
			ctx.userId,
		);

		// Add the expense
		const expenseId = await ctx.db.insert("expenses", {
			groupId: group._id,
			currency: args.currency,
			description: args.description,
			tag: normalizeExpenseTag(args.tag),
			payerId: args.payerId,
			items: args.items,
			date: args.date,
			type: ExpenseType.Split,
		});

		return expenseId;
	},
});

/**
 * Settle up a balance with another member
 */
export const settleUp = protectedMutation({
	args: {
		telegramChatId: v.number(),
		telegramUserId: v.number(),
		payerId: v.id("users"),
		receiverId: v.id("users"),
		currency: v.string(),
		amount: v.number(),
	},
	handler: async (ctx, args) => {
		const { group } = await getGroupWithParticipantValidation(
			ctx.db,
			{
				telegramChatId: args.telegramChatId,
				telegramUserId: args.telegramUserId,
				payerId: args.payerId,
				items: [
					{
						name: "Settlement",
						amount: args.amount,
						splits: [{ userId: args.receiverId, amount: args.amount }],
					},
				],
			},
			ctx.userId,
		);

		const expenseId = await ctx.db.insert("expenses", {
			groupId: group._id,
			currency: args.currency,
			description: "Settle",
			payerId: args.payerId,
			items: [
				{
					name: "Settlement",
					amount: args.amount,
					splits: [{ userId: args.receiverId, amount: args.amount }],
				},
			],
			date: Date.now(),
			type: ExpenseType.Transfer,
		});

		return expenseId;
	},
});

/**
 * Convert a settle-up balance from one currency to another.
 *
 * This inserts two transfer entries: one offsets the original-currency balance,
 * and the other recreates that balance in the converted currency.
 */
export const convertSettleUpCurrency = protectedMutation({
	args: {
		telegramChatId: v.number(),
		telegramUserId: v.number(),
		payerId: v.id("users"),
		receiverId: v.id("users"),
		fromCurrency: v.string(),
		toCurrency: v.string(),
		amount: v.number(),
		convertedAmount: v.number(),
	},
	handler: async (ctx, args) => {
		const originalAmount = roundMoney(args.amount);
		if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
			throw new Error("Amount must be greater than zero");
		}

		const fromCurrency = normalizeCurrencyCode(args.fromCurrency);
		const toCurrency = normalizeCurrencyCode(args.toCurrency);
		if (fromCurrency === toCurrency) {
			throw new Error("Choose a different currency to convert to");
		}

		const convertedAmount = roundMoney(args.convertedAmount);
		if (!Number.isFinite(convertedAmount) || convertedAmount <= 0) {
			throw new Error("Converted amount is too small");
		}

		const { group } = await getGroupWithParticipantValidation(
			ctx.db,
			{
				telegramChatId: args.telegramChatId,
				telegramUserId: args.telegramUserId,
				payerId: args.payerId,
				items: [
					{
						name: "Original settlement currency",
						amount: originalAmount,
						splits: [{ userId: args.receiverId, amount: originalAmount }],
					},
				],
			},
			ctx.userId,
		);

		const date = Date.now();
		const originalExpenseId = await ctx.db.insert("expenses", {
			groupId: group._id,
			currency: fromCurrency,
			description: `Convert settlement from ${fromCurrency}`,
			payerId: args.payerId,
			items: [
				{
					name: "Original settlement currency",
					amount: originalAmount,
					splits: [{ userId: args.receiverId, amount: originalAmount }],
				},
			],
			date,
			type: ExpenseType.Transfer,
		});

		const convertedExpenseId = await ctx.db.insert("expenses", {
			groupId: group._id,
			currency: toCurrency,
			description: `Converted settlement to ${toCurrency}`,
			payerId: args.receiverId,
			items: [
				{
					name: "Converted settlement currency",
					amount: convertedAmount,
					splits: [{ userId: args.payerId, amount: convertedAmount }],
				},
			],
			date,
			type: ExpenseType.Transfer,
		});

		return { convertedExpenseId, originalExpenseId };
	},
});

/**
 * Update group settings (default currency)
 */
export const updateGroupSettings = protectedMutation({
	args: {
		telegramChatId: v.number(),
		telegramUserId: v.number(),
		defaultCurrency: v.string(),
	},
	handler: async (ctx, args) => {
		// Check user match
		const user = await ctx.db.get(ctx.userId);
		if (!user || user.telegramUserId !== args.telegramUserId) {
			throw new Error("User mismatch");
		}

		// Find the group by Telegram chat ID
		const group = await ctx.db
			.query("groups")
			.withIndex("by_telegram_chat_id", (q) =>
				q.eq("telegramChatId", args.telegramChatId),
			)
			.first();

		if (!group) {
			throw new Error("Group not found");
		}

		// Check if the user is a member of the group
		const membership = await ctx.db
			.query("group_members")
			.withIndex("by_group_id", (q) => q.eq("groupId", group._id))
			.filter((q) => q.eq(q.field("userId"), ctx.userId))
			.first();

		if (!membership) {
			throw new Error("User is not a member of this group");
		}

		// Update the group settings
		await ctx.db.patch(group._id, {
			defaultCurrency: args.defaultCurrency,
		});

		return group._id;
	},
});

/**
 * Update an existing expense
 */
export const updateExpense = protectedMutation({
	args: {
		expenseId: v.id("expenses"),
		telegramChatId: v.number(),
		telegramUserId: v.number(),
		payerId: v.id("users"),
		currency: v.string(),
		description: v.string(),
		tag: v.optional(v.union(v.string(), v.null())),
		date: v.number(),
		items: expenseItemsValidator,
	},
	handler: async (ctx, args) => {
		// Verify the expense exists
		const expense = await ctx.db.get(args.expenseId);
		if (!expense) {
			throw new Error("Expense not found");
		}

		const { group } = await getGroupWithParticipantValidation(
			ctx.db,
			args,
			ctx.userId,
		);

		// Verify expense belongs to this group
		if (expense.groupId !== group._id) {
			throw new Error("Expense does not belong to this group");
		}

		// Update the expense
		await ctx.db.patch(args.expenseId, {
			currency: args.currency,
			description: args.description,
			tag: normalizeExpenseTag(args.tag),
			payerId: args.payerId,
			items: args.items,
			date: args.date,
		});

		return args.expenseId;
	},
});
