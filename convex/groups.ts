import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Create or get a group by Telegram chat ID
 * Used when the bot is added to a Telegram group
 */
export const createOrGetGroupByChatId = mutation({
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
    });

    return groupId;
  },
});

/**
 * Check if a user is a member of a group
 */
export const isUserMemberOfGroup = query({
  args: {
    telegramChatId: v.number(),
    telegramUserId: v.number(),
  },
  handler: async (ctx, args) => {
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

    // Find the user by Telegram user ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .first();

    if (!user) {
      return false;
    }

    // Check if the user is a member of the group
    const membership = await ctx.db
      .query("group_members")
      .withIndex("by_group_id", (q) => q.eq("groupId", group._id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    return membership !== null;
  },
});

/**
 * Get overall statistics for a user
 * Returns summary of expenses, debts, and pending splits
 */
export const getOverallStats = query({
  args: {
    userId: v.number(),
  },
  handler: async (ctx, args) => {
    const userDocId = await getAuthUserId(ctx);
    if (!userDocId) {
      throw new Error("User not found");
    }
    const user = await ctx.db.get(userDocId);
    if (!user) {
      throw new Error("User not found");
    }
    const telegramUserId = user.telegramUserId;
    if (telegramUserId !== args.userId) {
      throw new Error("User not authorized");
    }

    return {
      totalOwed: 125.5,
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
    userId: v.number(),
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
          totalOwed: 75.5,
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
          totalOwed: 40.0,
          totalOwedToMe: 30.0,
          netAmount: -10.0,
        },
      },
      {
        _id: "group3" as any,
        name: "Office Lunch",
        memberIds: ["user1", "user2", "user3", "user4", "user5"],
        stats: {
          pendingSplitsCount: 2,
          totalOwed: 10.0,
          totalOwedToMe: 10.0,
          netAmount: 0,
        },
      },
    ];
  },
});

/**
 * Get a group by Telegram chat ID
 */
export const getListOfExpenses = query({
  args: {
    telegramChatId: v.number(),
  },
  handler: async (ctx, args) => {
    const group = await ctx.db
      .query("groups")
      .withIndex("by_telegram_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId),
      )
      .first();

    if (!group) return null;

    // Reuse the same logic as getGroup to fetch members, expenses, and stats
    // Fetch members
    const groupMembers = await ctx.db
      .query("group_members")
      .withIndex("by_group_id", (q) => q.eq("groupId", group._id))
      .collect();

    const memberIds = groupMembers.map((m) => m.userId);
    const members = await Promise.all(memberIds.map((id) => ctx.db.get(id)));

    // Fetch expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group_id", (q) => q.eq("groupId", group._id))
      .order("desc")
      .collect();

    // Calculate basic stats
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      ...group,
      members: members.filter((m) => m !== null),
      expenses,
      totalExpenses,
      memberCount: members.length,
    };
  },
});

/**
 * Add a user to a group
 */
export const addUserToGroup = mutation({
  args: {
    telegramChatId: v.number(),
    telegramUserId: v.number(),
  },
  handler: async (ctx, args) => {
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

    // Find the user by Telegram user ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user is already a member
    const existingMembership = await ctx.db
      .query("group_members")
      .withIndex("by_group_id", (q) => q.eq("groupId", group._id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingMembership) {
      return existingMembership._id;
    }

    // Add the user to the group
    const membershipId = await ctx.db.insert("group_members", {
      groupId: group._id,
      userId: user._id,
    });

    return membershipId;
  },
});

/**
 * Add an expense to a group
 */
export const addExpense = mutation({
  args: {
    telegramChatId: v.number(),
    telegramUserId: v.number(),
    amount: v.number(),
    description: v.string(),
    splitType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    // Find the user by Telegram user ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user is a member of the group
    const membership = await ctx.db
      .query("group_members")
      .withIndex("by_group_id", (q) => q.eq("groupId", group._id))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (!membership) {
      throw new Error("User is not a member of this group");
    }

    // Add the expense
    const expenseId = await ctx.db.insert("expenses", {
      groupId: group._id,
      amount: args.amount,
      description: args.description,
      payerId: user._id,
      splitType: args.splitType || "equal",
      date: Date.now(),
    });

    return expenseId;
  },
});
