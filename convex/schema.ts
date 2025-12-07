import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const expenseItemSchema = v.object({
  name: v.string(),
  amount: v.number(),
  splits: v.array(
    v.object({
      userId: v.id("users"),
      amount: v.number(), // Share exact amount for each user
    }),
  ),
});

export default defineSchema({
  ...authTables,
  users: defineTable({
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    telegramUserId: v.number(),
  }).index("by_telegram_user_id", ["telegramUserId"]),

  groups: defineTable({
    telegramChatId: v.number(),
    title: v.string(),
    telegramChatType: v.string(),
    isForum: v.boolean(),
    defaultCurrency: v.string(),
  }).index("by_telegram_chat_id", ["telegramChatId"]),
  // Link table for many-to-many relationship between users and groups
  group_members: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
  })
    .index("by_group_id", ["groupId"])
    .index("by_user_id", ["userId"]),

  expenses: defineTable({
    groupId: v.id("groups"),
    amount: v.number(),
    currency: v.string(),
    description: v.string(),
    payerId: v.id("users"),
    // Multiple sub-items support
    items: v.array(expenseItemSchema),
    date: v.number(),
  }).index("by_group_id", ["groupId"]),
});
