"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  ChevronRight,
  ArrowRight,
  Settings,
} from "lucide-react";
import Link from "next/link";

import { AddExpenseButton } from "./add-expense-button";
import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import MainButton from "../../main-button";
import { useMemo } from "react";

type MemberBalance = {
  memberId: Id<"users">;
  memberName: string;
  balance: number;
};
type CurrencyData = {
  netBalance: number;
  memberBalances: Record<string, MemberBalance>;
};
type CurrencyBalances = Record<string, CurrencyData>;

export default function GroupView({
  preloadedGroupData,
  preloadedIsRegisteredMemberOfGroup,
}: {
  preloadedGroupData: Preloaded<typeof api.groups.getListOfExpenses>;
  preloadedIsRegisteredMemberOfGroup: Preloaded<
    typeof api.groups.isUserMemberOfGroup
  >;
}) {
  const groupData = usePreloadedQuery(preloadedGroupData);
  const isRegisteredMemberOfGroup = usePreloadedQuery(
    preloadedIsRegisteredMemberOfGroup,
  );
  const { id, groupId } = useParams<{ id: string; groupId: string }>();
  const router = useRouter();
  const addUserToGroupMutation = useMutation(api.groups.addUserToGroup);
  const telegramUserId = Number(id);
  const groupIdNumber = Number(groupId);

  // Find current user's internal ID from members
  const currentUserId = groupData?.members.find(
    (m) => m.telegramUserId === telegramUserId,
  )?._id;

  // Calculate balances per currency, with member balances nested inside each currency
  const currencyBalances = useMemo(() => {
    if (!groupData || !currentUserId) {
      return {} as CurrencyBalances;
    }

    const currencyBalances: CurrencyBalances = {};

    // Helper to get or create currency data
    const getOrCreateCurrency = (currency: string): CurrencyData => {
      if (!(currency in currencyBalances)) {
        currencyBalances[currency] = { netBalance: 0, memberBalances: {} };
      }
      return currencyBalances[currency];
    };

    // Helper to get or create member balance within a currency
    const getOrCreateMemberBalance = (
      currencyData: CurrencyData,
      memberId: Id<"users">,
    ): MemberBalance => {
      if (!(memberId in currencyData.memberBalances)) {
        const member = groupData.members.find((m) => m._id === memberId);
        currencyData.memberBalances[memberId] = {
          memberId,
          memberName: member?.firstName || member?.username || "Unknown",
          balance: 0,
        };
      }
      return currencyData.memberBalances[memberId];
    };

    for (const expense of groupData.expenses) {
      const currency = expense.currency;
      const payerId = expense.payerId;
      const isCurrentUserPayer = payerId === currentUserId;
      const currencyData = getOrCreateCurrency(currency);

      // Process each item and its splits
      for (const item of expense.items) {
        for (const split of item.splits) {
          const splitUserId = split.userId;
          const amount = split.amount;

          if (isCurrentUserPayer) {
            // Current user paid - others owe current user their split amounts
            if (splitUserId !== currentUserId) {
              // Other person owes current user
              currencyData.netBalance += amount;
              const memberBalance = getOrCreateMemberBalance(
                currencyData,
                splitUserId,
              );
              memberBalance.balance += amount;
            }
          } else {
            // Someone else paid
            if (splitUserId === currentUserId) {
              // Current user owes the payer
              currencyData.netBalance -= amount;
              const memberBalance = getOrCreateMemberBalance(
                currencyData,
                payerId,
              );
              memberBalance.balance -= amount;
            }
          }
        }
      }
    }

    return currencyBalances;
  }, [groupData, currentUserId]);

  // Calculate user's balance for an expense
  // Positive = user is owed money, Negative = user owes money
  const calculateUserBalance = (expense: (typeof expenses)[number]) => {
    if (!currentUserId) return 0;

    const totalAmount = expense.items.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    // Calculate what the current user owes (their share in splits)
    let userOwes = 0;
    for (const item of expense.items) {
      for (const split of item.splits) {
        if (split.userId === currentUserId) {
          userOwes += split.amount;
        }
      }
    }

    // If user is the payer, they paid the total and are owed by others
    const isPayer = expense.payerId === currentUserId;
    const userPaid = isPayer ? totalAmount : 0;

    // Balance = what they paid - what they owe
    return userPaid - userOwes;
  };

  const handleEditExpense = (expense: (typeof expenses)[number]) => {
    // Build URL params with expense data
    const params = new URLSearchParams({
      expenseId: expense._id,
      description: expense.description,
      currency: expense.currency,
      payerId: expense.payerId,
      date: expense.date.toString(),
      items: JSON.stringify(expense.items),
    });
    router.push(
      `/app/${telegramUserId}/group/${groupIdNumber}/add-expense?${params.toString()}`,
    );
  };

  if (!groupData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  const { title, members, expenses, memberCount, defaultCurrency } = groupData;
  const currencyCode = defaultCurrency || "USD";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp));
  };

  const handleJoinGroup = async () => {
    try {
      await addUserToGroupMutation({
        telegramChatId: groupIdNumber,
        telegramUserId: telegramUserId,
      });
    } catch (error) {
      console.error("Failed to join group:", error);
      alert("Failed to join group. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-20 relative">
      {!isRegisteredMemberOfGroup && (
        <div className="absolute inset-0 bg-black/50 z-40" />
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 text-white p-6 pb-12">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
      </div>

      <div className="px-4 -mt-12 space-y-6">
        {/* Stats Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Balance
            </h2>
            <Link
              href={`/app/${telegramUserId}/group/${groupIdNumber}/settings`}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </Link>
          </div>
          <div className="space-y-4">
            {/* Per-currency balances with nested member balances */}
            {Object.keys(currencyBalances).length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No expenses yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(currencyBalances).map(
                  ([currency, currencyData]) => {
                    const isPositive = currencyData.netBalance >= 0;
                    const memberBalanceEntries = Object.values(
                      currencyData.memberBalances,
                    ).filter((m) => m.balance !== 0);

                    return (
                      <div
                        key={currency}
                        className={`${
                          isPositive
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                        } border rounded-xl p-4`}
                      >
                        {/* Currency header with net balance */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span
                              className={`text-sm font-medium block mb-1 ${
                                isPositive
                                  ? "text-green-700 dark:text-green-300"
                                  : "text-red-700 dark:text-red-300"
                              }`}
                            >
                              {currency}
                            </span>
                            <p
                              className={`text-2xl font-bold ${
                                isPositive
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: currency,
                              }).format(currencyData.netBalance)}
                            </p>
                          </div>
                          <div
                            className={`p-3 rounded-full ${
                              isPositive
                                ? "bg-green-100 dark:bg-green-800/30 text-green-600"
                                : "bg-red-100 dark:bg-red-800/30 text-red-600"
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-6 h-6" />
                            ) : (
                              <TrendingDown className="w-6 h-6" />
                            )}
                          </div>
                        </div>

                        {/* Member balances for this currency */}
                        {memberBalanceEntries.length > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2 space-y-2">
                            {memberBalanceEntries.map((member) => {
                              const isMemberPositive = member.balance > 0;
                              return (
                                <div
                                  key={member.memberId}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold">
                                      {member.memberName[0]?.toUpperCase() ||
                                        "?"}
                                    </div>
                                    <span className="text-sm text-gray-700 dark:text-gray-200">
                                      {member.memberName}
                                    </span>
                                    <div className="flex items-center gap-1 text-xs">
                                      {isMemberPositive ? (
                                        <>
                                          <span className="text-gray-500 dark:text-gray-400">
                                            owes you
                                          </span>
                                          <ArrowRight className="w-3 h-3 text-green-500" />
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-gray-500 dark:text-gray-400">
                                            you owe
                                          </span>
                                          <ArrowRight className="w-3 h-3 text-red-500" />
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <span
                                    className={`text-sm font-semibold ${
                                      isMemberPositive
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400"
                                    }`}
                                  >
                                    {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: currency,
                                    }).format(Math.abs(member.balance))}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>
        </div>

        {/* Members */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Users className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Members ({memberCount})
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-full px-3 py-1.5 border border-gray-100 dark:border-gray-700"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {(
                      member.firstName?.[0] ||
                      member.username?.[0] ||
                      "?"
                    ).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {member.firstName} {member.lastName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Receipt className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Expenses
            </h2>
          </div>

          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl">
                <p>No expenses yet</p>
              </div>
            ) : (
              expenses.map((expense) => {
                const isMe = expense.payerTelegramUserId === telegramUserId;
                const balance = calculateUserBalance(expense);
                const isInvolved = balance !== 0;

                const totalAmount = expense.items.reduce(
                  (sum, item) => sum + item.amount,
                  0,
                );

                // Determine styling based on balance
                const getBalanceStyles = () => {
                  if (!isInvolved) {
                    return {
                      iconBg:
                        "bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500",
                      amountText: "text-gray-900 dark:text-white",
                      amountPrefix: "",
                    };
                  }
                  if (balance > 0) {
                    return {
                      iconBg:
                        "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
                      amountText: "text-green-600 dark:text-green-400",
                      amountPrefix: "+",
                    };
                  }
                  // balance < 0
                  return {
                    iconBg:
                      "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
                    amountText: "text-red-600 dark:text-red-400",
                    amountPrefix: "-",
                  };
                };

                const styles = getBalanceStyles();

                return (
                  <button
                    type="button"
                    key={expense._id}
                    onClick={() => handleEditExpense(expense)}
                    className={`w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${!isInvolved ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.iconBg}`}
                      >
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {expense.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isMe ? "You" : expense.payerName} paid •{" "}
                          {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`font-bold ${styles.amountText}`}>
                          {styles.amountPrefix}
                          {formatCurrency(
                            isInvolved ? Math.abs(balance) : totalAmount,
                          )}
                        </span>
                        {isInvolved && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(totalAmount)}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isRegisteredMemberOfGroup ? (
        <MainButton text="Join Group" onClick={handleJoinGroup} once />
      ) : (
        <AddExpenseButton
          telegramChatId={groupIdNumber}
          telegramUserId={telegramUserId}
        />
      )}
    </div>
  );
}
