"use client";

import { useMutation } from "convex/react";
import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

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

interface SettleUpProps {
  currencyBalances: CurrencyBalances;
  currentUserId: Id<"users">;
  telegramUserId: number;
  groupIdNumber: number;
}

export function SettleUp({
  currencyBalances,
  currentUserId,
  telegramUserId,
  groupIdNumber,
}: SettleUpProps) {
  const settleUpMutation = useMutation(api.groups.settleUp);

  const [settleDialog, setSettleDialog] = useState<{
    memberId: string;
    memberName: string;
    amount: number;
    currency: string;
  } | null>(null);

  const handleSettle = async () => {
    if (!settleDialog || !currentUserId) return;

    try {
      const payerId =
        settleDialog.amount > 0 ? settleDialog.memberId : currentUserId;
      const receiverId =
        settleDialog.amount > 0 ? currentUserId : settleDialog.memberId;
      const amount = Math.abs(settleDialog.amount);

      await settleUpMutation({
        telegramChatId: groupIdNumber,
        telegramUserId: telegramUserId,
        payerId: payerId as Id<"users">,
        receiverId: receiverId as Id<"users">,
        currency: settleDialog.currency,
        amount: amount,
      });
      setSettleDialog(null);
    } catch (error) {
      console.error("Failed to settle:", error);
      alert("Failed to settle. Please try again.");
    }
  };

  const hasBalances =
    Object.keys(currencyBalances).length > 0 &&
    Object.values(currencyBalances).some((c) =>
      Object.values(c.memberBalances).some((m) => m.balance !== 0),
    );

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <ArrowLeftRight className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Settle Up
          </h2>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
          {!hasBalances ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
              All settled up!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mb-2">
              {Object.entries(currencyBalances).map(
                ([currency, currencyData]) =>
                  Object.entries(currencyData.memberBalances)
                    .filter(([, member]) => member.balance !== 0)
                    .map(([memberId, member]) => (
                      <button
                        type="button"
                        key={`${currency}-${memberId}`}
                        onClick={() =>
                          setSettleDialog({
                            memberId,
                            memberName: member.memberName,
                            amount: member.balance,
                            currency,
                          })
                        }
                        className={`flex items-center gap-2 rounded-full px-3 py-1.5 border text-sm font-medium whitespace-nowrap transition-colors ${
                          member.balance > 0
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40"
                            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
                        }`}
                      >
                        <span>
                          {member.balance > 0 ? "Collect from" : "Pay"}{" "}
                          {member.memberName}
                        </span>
                        <span className="font-bold">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency,
                          }).format(Math.abs(member.balance))}
                        </span>
                      </button>
                    )),
              )}
            </div>
          )}
        </div>
      </div>

      {settleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirm Settlement
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {settleDialog.amount > 0
                ? `Collect ${new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: settleDialog.currency,
                  }).format(
                    settleDialog.amount,
                  )} from ${settleDialog.memberName}?`
                : `Pay ${new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: settleDialog.currency,
                  }).format(
                    Math.abs(settleDialog.amount),
                  )} to ${settleDialog.memberName}?`}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSettleDialog(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettle}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
