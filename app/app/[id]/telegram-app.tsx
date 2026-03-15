"use client";

import { type Preloaded, usePreloadedQuery } from "convex/react";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { api } from "@/convex/_generated/api";

export default function TelegramApp({
  preloadedDashboard,
  userId,
}: {
  preloadedDashboard: Preloaded<typeof api.groups.getDashboardData>;
  userId: number;
}) {
  // Fetch all dashboard data from single query
  const dashboardData = usePreloadedQuery(preloadedDashboard);

  if (dashboardData === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading stats...</p>
        </div>
      </div>
    );
  }

  const { stats, groupsWithPendingSplits, balancesByCurrency } = dashboardData;

  const formatCurrencyAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 text-white p-6 pb-12">
        <h1 className="text-3xl font-bold mb-2">NanaSplits</h1>
        <p className="text-blue-50">Your expense splitting dashboard</p>
      </div>

      {/* Overall Stats */}
      <div className="px-6 -mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Your Balances
          </h2>

          {/* Per-currency balances with nested member balances */}
          <div className="space-y-4 mb-6">
            {balancesByCurrency.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <p>No pending balances</p>
              </div>
            ) : (
              <div className="space-y-3">
                {balancesByCurrency.map((currencyData) => {
                  const isPositive = currencyData.netBalance >= 0;

                  return (
                    <div
                      key={currencyData.currency}
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
                            {currencyData.currency}
                          </span>
                          <p
                            className={`text-2xl font-bold ${
                              isPositive
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {formatCurrencyAmount(
                              currencyData.netBalance,
                              currencyData.currency,
                            )}
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
                      {currencyData.memberBalances.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2 space-y-2">
                          {currencyData.memberBalances.map((member) => {
                            const isMemberPositive = member.balance > 0;
                            return (
                              <div
                                key={member.memberId}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-white/50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 flex items-center justify-center text-xs font-bold">
                                    {member.memberName[0]?.toUpperCase() || "?"}
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
                                  {formatCurrencyAmount(
                                    Math.abs(member.balance),
                                    currencyData.currency,
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary stats */}

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Groups
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white text-right">
              {stats.groupsWithPendingSplits}
            </p>
          </div>
        </div>

        {/* Groups with Pending Splits */}
        {groupsWithPendingSplits.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Active Groups
            </h2>
            <div className="space-y-2">
              {groupsWithPendingSplits.map((group) => (
                <Link
                  href={`/app/${userId}/group/${group.telegramChatId}`}
                  key={group._id}
                >
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {group.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {group.memberIds.length} members
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {group.stats.map((currencyStats) => {
                        const isPositive = currencyStats.netAmount >= 0;
                        return (
                          <div
                            key={currencyStats.currency}
                            className={`flex items-center justify-between rounded-lg p-3 ${
                              isPositive
                                ? "bg-green-50 dark:bg-green-900/20"
                                : "bg-red-50 dark:bg-red-900/20"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isPositive ? (
                                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                              )}
                              <span
                                className={`text-sm font-medium ${
                                  isPositive
                                    ? "text-green-700 dark:text-green-300"
                                    : "text-red-700 dark:text-red-300"
                                }`}
                              >
                                {currencyStats.currency}
                              </span>
                            </div>
                            <p
                              className={`text-lg font-semibold ${
                                isPositive
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {formatCurrencyAmount(
                                currencyStats.netAmount,
                                currencyStats.currency,
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Pending Splits
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All your expenses are settled! 🎉
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
