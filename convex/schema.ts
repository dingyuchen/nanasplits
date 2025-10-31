import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	groups: defineTable({
		telegramChatId: v.string(),
		name: v.string(),
		memberIds: v.array(v.string()), // Telegram user IDs
		createdBy: v.string(), // Telegram user ID
	}).index("telegramChatId", ["telegramChatId"]),

	expenses: defineTable({
		groupId: v.id("groups"),
		description: v.string(),
		amount: v.number(),
		paidBy: v.string(), // Telegram user ID
		splitAmong: v.array(v.string()), // Telegram user IDs
		createdAt: v.number(),
		settled: v.boolean(),
	})
		.index("groupId", ["groupId"])
		.index("settled", ["settled"]),

	splits: defineTable({
		expenseId: v.id("expenses"),
		groupId: v.id("groups"),
		fromUserId: v.string(), // Telegram user ID who owes
		toUserId: v.string(), // Telegram user ID who is owed
		amount: v.number(),
		settled: v.boolean(),
	})
		.index("groupId", ["groupId"])
		.index("settled", ["settled"])
		.index("fromUserId", ["fromUserId"]),
});
