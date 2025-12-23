"use client";

import { api } from "@/convex/_generated/api";
import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Globe, Users, Loader2, Check } from "lucide-react";
import { currencySigns } from "../add-expense/currency-dropdown-options";
import MainButton from "../../../main-button";

export default function GroupSettings({
  preloadedGroupData,
  telegramUserId,
  telegramChatId,
}: {
  preloadedGroupData: Preloaded<typeof api.groups.getListOfExpenses>;
  telegramUserId: number;
  telegramChatId: number;
}) {
  const groupData = usePreloadedQuery(preloadedGroupData);
  const router = useRouter();
  const updateGroupSettings = useMutation(api.groups.updateGroupSettings);

  const [selectedCurrency, setSelectedCurrency] = useState(
    groupData?.defaultCurrency || "USD",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const hasChanges = selectedCurrency !== groupData?.defaultCurrency;

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await updateGroupSettings({
        telegramChatId,
        telegramUserId,
        defaultCurrency: selectedCurrency,
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
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

  const { title, members } = groupData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Group Settings</h1>
        </div>
        <p className="text-blue-100 text-sm ml-8">{title}</p>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Default Currency */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Default Currency
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Used for new expenses in this group
              </p>
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {Object.entries(currencySigns).map(([code, sign]) => (
                <option key={code} value={code}>
                  {code} ({sign})
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-2xl text-gray-400">
                {currencySigns[selectedCurrency] || "$"}
              </span>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Members
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {members.length} member{members.length !== 1 ? "s" : ""} in this
                group
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {members.map((member) => {
              const isCurrentUser = member.telegramUserId === telegramUserId;
              return (
                <div
                  key={member._id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isCurrentUser
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      : "bg-gray-50 dark:bg-gray-700/50"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCurrentUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {(
                      member.firstName?.[0] ||
                      member.username?.[0] ||
                      "?"
                    ).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {member.firstName} {member.lastName}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                          (You)
                        </span>
                      )}
                    </p>
                    {member.username && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        @{member.username}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Button */}
      {hasChanges && (
        <MainButton
          text={
            isSaving ? "Saving..." : showSuccess ? "Saved!" : "Save Changes"
          }
          onClick={handleSave}
          show={!isSaving && !showSuccess}
          ready={!isSaving && !showSuccess}
        />
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-fade-in z-50">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Settings saved!</span>
        </div>
      )}
    </div>
  );
}
