"use client";

import { api } from "@/convex/_generated/api";
import {
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
} from "lucide-react";

import { AddExpenseButton } from "./add-expense-button";
import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { useParams } from "next/navigation";
import MainButton from "../../main-button";

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
  const addUserToGroupMutation = useMutation(api.groups.addUserToGroup);
  const telegramUserId = Number(id);
  const groupIdNumber = Number(groupId);

  if (!groupData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  const {
    title,
    members,
    expenses,
    totalExpenses,
    memberCount,
    defaultCurrency,
  } = groupData;
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Balance
          </h2>
          <div className="space-y-4">
            <div
              className={`${
                totalExpenses >= 0
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
              } border rounded-xl p-4 flex items-center justify-between`}
            >
              <div>
                <span
                  className={`text-sm font-medium block mb-1 ${
                    totalExpenses >= 0
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-orange-700 dark:text-orange-300"
                  }`}
                >
                  Net Balance
                </span>
                <p
                  className={`text-3xl font-bold ${
                    totalExpenses >= 0
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-orange-600 dark:text-orange-400"
                  }`}
                >
                  {totalExpenses >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(totalExpenses))}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${totalExpenses >= 0 ? "bg-blue-100 dark:bg-blue-800/30 text-blue-600" : "bg-orange-100 dark:bg-orange-800/30 text-orange-600"}`}
              >
                {totalExpenses >= 0 ? (
                  <TrendingUp className="w-6 h-6" />
                ) : (
                  <TrendingDown className="w-6 h-6" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Total Spent
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(totalExpenses)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Your Share
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(totalExpenses / memberCount)}
                </p>
              </div>
            </div>
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
                const payer = members.find((m) => m._id === expense.payerId);
                const isMe = payer?.telegramUserId === telegramUserId;

                return (
                  <div
                    key={expense._id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {expense.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {payer ? (isMe ? "You" : payer.firstName) : "Unknown"}{" "}
                          paid • {formatDate(expense.date)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!isRegisteredMemberOfGroup ? (
        <MainButton text="Join Group" onClick={handleJoinGroup} />
      ) : (
        <AddExpenseButton
          telegramChatId={groupIdNumber}
          telegramUserId={telegramUserId}
          defaultCurrency={currencyCode}
        />
      )}
    </div>
  );
}
