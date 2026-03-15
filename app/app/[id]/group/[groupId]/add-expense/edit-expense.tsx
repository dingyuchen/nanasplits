"use client";

import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import {
  ArrowLeft,
  Calendar,
  Check,
  Plus,
  Split,
  Trash2,
  X,
} from "lucide-react";
import type { ValueOf } from "next/dist/shared/lib/constants";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import MainButton from "../../../main-button";
import CurrencyDropdownOptions, {
  currencySigns,
} from "./currency-dropdown-options";

interface EditExpenseSearchParams {
  expenseId: string | null;
  description: string;
  currency: string | null;
  payerId: string | null;
  date: string | null;
  items: string | null;
}

// Zod validation schemas
const splitShareSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().nonnegative(),
});

const subItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  splits: z.array(splitShareSchema),
});

const baseExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  payerId: z.string().min(1, "Payer is required"),
  currency: z.string().min(1),
});

const simpleExpenseSchema = baseExpenseSchema.extend({
  amount: z.number().positive("Amount must be greater than 0"),
});

const itemizedExpenseSchema = baseExpenseSchema.extend({
  items: z.array(subItemSchema).min(1, "At least one item is required"),
});

type SplitType = "equal" | "exact" | "percentage" | "shares";

interface SplitShare {
  userId: Id<"users">;
  amount: number;
}

interface SubItem {
  name: string;
  amount: number;
  splits: SplitShare[];
}

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (splits: SplitShare[]) => void;
  amount: number;
  members: Doc<"users">[]; // Using any[] for now as Member type is complex
  initialSplits: SplitShare[];
  itemName: string;
  currency: string;
}

function SplitModal({
  isOpen,
  onClose,
  onSave,
  amount,
  members,
  initialSplits,
  itemName,
  currency,
}: SplitModalProps) {
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [splits, setSplits] = useState<SplitShare[]>(initialSplits);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(
    initialSplits.length > 0
      ? initialSplits.map((s) => s.userId)
      : members.map((m) => m._id),
  );
  // For percentage mode, store percentage values separately
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  // For shares mode, store share counts separately
  const [shares, setShares] = useState<Record<string, number>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Get ordered list of selected users (maintain order for "last user" logic)
  const orderedSelectedUsers = useMemo(() => {
    return members
      .filter((m) => selectedUsers.includes(m._id))
      .map((m) => m._id);
  }, [members, selectedUsers]);

  const lastSelectedUserId =
    orderedSelectedUsers[orderedSelectedUsers.length - 1];

  // Initialize splits when split type changes or users are selected
  useEffect(() => {
    const userCount = orderedSelectedUsers.length;
    if (userCount === 0) return;

    if (splitType === "equal") {
      const splitAmount = amount / userCount;
      setSplits(
        orderedSelectedUsers.map((userId) => ({
          userId: userId as Id<"users">,
          amount: splitAmount,
        })),
      );
    } else if (splitType === "exact") {
      // Initialize with zeros for exact mode
      setSplits((prevSplits) => {
        return orderedSelectedUsers.map((userId) => {
          const existing = prevSplits.find((s) => s.userId === userId);
          return {
            userId: userId as Id<"users">,
            amount: existing?.amount ?? 0,
          };
        });
      });
    } else if (splitType === "percentage") {
      // Initialize percentages equally
      const equalPercent = 100 / userCount;
      setPercentages((prevPercentages) => {
        const newPercentages: Record<string, number> = {};
        for (const userId of orderedSelectedUsers) {
          newPercentages[userId] = prevPercentages[userId] ?? equalPercent;
        }
        return newPercentages;
      });
      setSplits((prevSplits) =>
        orderedSelectedUsers.map((userId) => {
          const existing = prevSplits.find((s) => s.userId === userId);
          return {
            userId: userId as Id<"users">,
            amount: existing?.amount ?? amount / userCount,
          };
        }),
      );
    } else if (splitType === "shares") {
      // Initialize with 1 share each
      setShares((prevShares) => {
        const newShares: Record<string, number> = {};
        for (const userId of orderedSelectedUsers) {
          newShares[userId] = prevShares[userId] ?? 1;
        }
        return newShares;
      });
      setSplits(
        orderedSelectedUsers.map((userId) => ({
          userId: userId as Id<"users">,
          amount: amount / userCount,
        })),
      );
    }
    setValidationError(null);
  }, [splitType, amount, orderedSelectedUsers]);

  // Auto-fill last user for exact mode
  const getExactAmountForUser = (userId: string): number => {
    if (userId === lastSelectedUserId) {
      const otherUsersTotal = splits
        .filter(
          (s) =>
            s.userId !== lastSelectedUserId && selectedUsers.includes(s.userId),
        )
        .reduce((sum, s) => sum + s.amount, 0);
      return Math.max(0, amount - otherUsersTotal);
    }
    return splits.find((s) => s.userId === userId)?.amount ?? 0;
  };

  // Auto-fill last user for percentage mode
  const getPercentageForUser = (userId: string): number => {
    if (userId === lastSelectedUserId) {
      const otherUsersTotal = Object.entries(percentages)
        .filter(
          ([id]) => id !== lastSelectedUserId && selectedUsers.includes(id),
        )
        .reduce((sum, [, pct]) => sum + pct, 0);
      return Math.max(0, 100 - otherUsersTotal);
    }
    return percentages[userId] ?? 0;
  };

  // Get share count for user
  const getSharesForUser = (userId: string): number => {
    return shares[userId] ?? 1;
  };

  // Calculate total shares
  const getTotalShares = (): number => {
    return selectedUsers.reduce(
      (sum, userId) => sum + getSharesForUser(userId),
      0,
    );
  };

  // Calculate amount based on shares
  const getAmountFromShares = (userId: string): number => {
    const totalShares = getTotalShares();
    if (totalShares === 0) return 0;
    return (getSharesForUser(userId) / totalShares) * amount;
  };

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
    setValidationError(null);
  };

  const handleExactAmountChange = (userId: string, newAmount: number) => {
    if (userId === lastSelectedUserId) return; // Last user is auto-calculated
    const newSplits = splits.map((s) =>
      s.userId === userId ? { ...s, amount: newAmount } : s,
    );
    if (!splits.find((s) => s.userId === userId)) {
      newSplits.push({ userId: userId as Id<"users">, amount: newAmount });
    }
    setSplits(newSplits);
    setValidationError(null);
  };

  const handlePercentageChange = (userId: string, newPercent: number) => {
    if (userId === lastSelectedUserId) return; // Last user is auto-calculated
    const newPercentages = { ...percentages, [userId]: newPercent };
    setPercentages(newPercentages);

    // Update splits based on new percentages
    const newSplits = selectedUsers.map((uid) => {
      const pct =
        uid === lastSelectedUserId
          ? Math.max(
              0,
              100 -
                Object.entries(newPercentages)
                  .filter(
                    ([id]) =>
                      id !== lastSelectedUserId && selectedUsers.includes(id),
                  )
                  .reduce((sum, [, p]) => sum + p, 0),
            )
          : (newPercentages[uid] ?? 0);
      return {
        userId: uid as Id<"users">,
        amount: (pct / 100) * amount,
      };
    });
    setSplits(newSplits);
    setValidationError(null);
  };

  const handleSharesChange = (userId: string, newShareCount: number) => {
    const validShares = Math.max(0, Math.floor(newShareCount)); // Shares must be non-negative integers
    const newShares = { ...shares, [userId]: validShares };
    setShares(newShares);

    // Update splits based on new shares
    const totalShares = selectedUsers.reduce(
      (sum, uid) => sum + (newShares[uid] ?? 1),
      0,
    );
    if (totalShares > 0) {
      const newSplits = selectedUsers.map((uid) => ({
        userId: uid as Id<"users">,
        amount: ((newShares[uid] ?? 1) / totalShares) * amount,
      }));
      setSplits(newSplits);
    }
    setValidationError(null);
  };

  // Compute final splits with auto-fill applied
  const getFinalSplits = (): SplitShare[] => {
    if (splitType === "equal") {
      return splits;
    }
    if (splitType === "exact") {
      return selectedUsers.map((userId) => ({
        userId: userId as Id<"users">,
        amount: getExactAmountForUser(userId),
      }));
    }
    if (splitType === "percentage") {
      return selectedUsers.map((userId) => ({
        userId: userId as Id<"users">,
        amount: (getPercentageForUser(userId) / 100) * amount,
      }));
    }
    if (splitType === "shares") {
      return selectedUsers.map((userId) => ({
        userId: userId as Id<"users">,
        amount: getAmountFromShares(userId),
      }));
    }
    return splits;
  };

  const validateSplits = (): boolean => {
    const finalSplits = getFinalSplits();

    // Check all values are positive
    const hasNegative = finalSplits.some((s) => s.amount < 0);
    if (hasNegative) {
      setValidationError("All amounts must be positive");
      return false;
    }

    // Check total matches (with small tolerance for floating point)
    const total = finalSplits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(total - amount) > 0.01) {
      setValidationError(
        `Total (${total.toFixed(2)}) doesn't match expense amount (${amount.toFixed(2)})`,
      );
      return false;
    }

    // For percentage mode, check percentages add to 100
    if (splitType === "percentage") {
      const totalPercent = selectedUsers.reduce(
        (sum, userId) => sum + getPercentageForUser(userId),
        0,
      );
      if (Math.abs(totalPercent - 100) > 0.01) {
        setValidationError(
          `Percentages must add up to 100% (currently ${totalPercent.toFixed(1)}%)`,
        );
        return false;
      }
    }

    // For shares mode, check total shares is positive
    if (splitType === "shares") {
      const totalShares = getTotalShares();
      if (totalShares <= 0) {
        setValidationError("Total shares must be greater than 0");
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleSave = () => {
    if (!validateSplits()) return;
    onSave(getFinalSplits());
  };

  const totalAssigned = getFinalSplits().reduce((sum, s) => sum + s.amount, 0);
  const totalPercent =
    splitType === "percentage"
      ? selectedUsers.reduce(
          (sum, userId) => sum + getPercentageForUser(userId),
          0,
        )
      : 0;
  const totalSharesDisplay = splitType === "shares" ? getTotalShares() : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Split Expense
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {itemName} • {amount.toFixed(2)} {currency}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <button
              type="button"
              onClick={() => setSplitType("equal")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                splitType === "equal"
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Equal
            </button>
            <button
              type="button"
              onClick={() => setSplitType("exact")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                splitType === "exact"
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Exact
            </button>
            <button
              type="button"
              onClick={() => setSplitType("percentage")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                splitType === "percentage"
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setSplitType("shares")}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                splitType === "shares"
                  ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              Shares
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map((member) => {
              const isSelected = selectedUsers.includes(member._id);
              const isLastUser = member._id === lastSelectedUserId;

              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleUser(member._id)}
                      className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                      {splitType === "equal" && (
                        <span>
                          {(amount / selectedUsers.length).toFixed(2)}{" "}
                          {currency}
                        </span>
                      )}
                      {splitType === "exact" &&
                        (isLastUser ? (
                          <span className="text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                            {getExactAmountForUser(member._id).toFixed(2)}{" "}
                            {currency}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <CurrencyInput
                              value={getExactAmountForUser(member._id)}
                              onValueChange={(val) =>
                                handleExactAmountChange(member._id, val)
                              }
                              className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                              placeholder="0.00"
                            />
                            <span className="text-gray-400 text-xs">
                              {currency}
                            </span>
                          </div>
                        ))}
                      {splitType === "percentage" &&
                        (isLastUser ? (
                          <span className="text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                            {getPercentageForUser(member._id).toFixed(1)}%
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={getPercentageForUser(member._id) || ""}
                              onChange={(e) =>
                                handlePercentageChange(
                                  member._id,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="w-16 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                              placeholder="0"
                            />
                            <span className="text-gray-400 text-xs">%</span>
                          </div>
                        ))}
                      {splitType === "shares" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={getSharesForUser(member._id)}
                            onChange={(e) =>
                              handleSharesChange(
                                member._id,
                                parseInt(e.target.value, 10) || 0,
                              )
                            }
                            className="w-14 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          />
                          <span className="text-gray-400 text-xs">
                            = {getAmountFromShares(member._id).toFixed(2)}{" "}
                            {currency}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            {splitType === "percentage" && (
              <div className="flex justify-between mb-2 text-sm font-medium">
                <span className="text-gray-500 dark:text-gray-400">
                  Total percentage:
                </span>
                <span
                  className={
                    Math.abs(totalPercent - 100) < 0.01
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {totalPercent.toFixed(1)}%
                </span>
              </div>
            )}
            {splitType === "shares" && (
              <div className="flex justify-between mb-2 text-sm font-medium">
                <span className="text-gray-500 dark:text-gray-400">
                  Total shares:
                </span>
                <span
                  className={
                    totalSharesDisplay > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }
                >
                  {totalSharesDisplay}
                </span>
              </div>
            )}
            <div className="flex justify-between mb-2 text-sm font-medium">
              <span className="text-gray-500 dark:text-gray-400">
                Total assigned:
              </span>
              <span
                className={
                  Math.abs(totalAssigned - amount) < 0.01
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {totalAssigned.toFixed(2)} / {amount.toFixed(2)} {currency}
              </span>
            </div>
            {validationError && (
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {validationError}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={Math.abs(totalAssigned - amount) > 0.01}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Split
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditExpensePage({
  preloadedGroupExpenses,
  searchParams,
}: {
  preloadedGroupExpenses: Preloaded<typeof api.groups.getListOfExpenses>;
  searchParams: EditExpenseSearchParams;
}) {
  const router = useRouter();
  const params = useParams();

  const telegramUserId = Number(params.id);
  const telegramChatId = Number(params.groupId);

  // Check if we're editing an existing expense
  const expenseId = searchParams.expenseId as Id<"expenses"> | null;
  const isEditing = !!expenseId;

  const addExpense = useMutation(api.groups.addExpense);
  const updateExpense = useMutation(api.groups.updateExpense);
  const groupData = usePreloadedQuery(preloadedGroupExpenses);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const selectedCurrency = groupData?.defaultCurrency || "USD";
  const defaultSplits = (amount: number) =>
    groupData?.members.map((member) => {
      return {
        userId: member._id,
        amount: amount / groupData?.members.length || 0,
      };
    }) || [];

  // Parse URL params for editing
  const editDescription = searchParams.description || "";
  const editCurrency = searchParams.currency || selectedCurrency;
  const editPayerId = searchParams.payerId as Id<"users"> | null;
  const editDate = searchParams.date;
  const editItemsRaw = searchParams.items;
  const editItems: SubItem[] = editItemsRaw ? JSON.parse(editItemsRaw) : null;

  const [currency, setCurrency] = useState(editCurrency);
  const currencySymbol = currencySigns[currency] || "$";
  const [payer, setPayer] = useState<Doc<"users"> | null>(null);

  // Store date in state to persist across modal open/close
  const [date, setDate] = useState<string>(() => {
    if (editDate) {
      return new Date(Number(editDate)).toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  });

  // Initialize payer from URL params or default to current user
  useEffect(() => {
    if (groupData) {
      if (editPayerId) {
        const editPayer = groupData.members.find((m) => m._id === editPayerId);
        if (editPayer) {
          setPayer((currentPayer) => currentPayer || editPayer);
          return;
        }
      }
      const currentUser = groupData.members.find(
        (m) => m.telegramUserId === telegramUserId,
      );
      if (currentUser) {
        setPayer((currentPayer) => currentPayer || currentUser);
      }
    }
  }, [groupData, telegramUserId, editPayerId]);

  // Initialize items from URL params or default
  const [items, setItems] = useState<SubItem[]>(() => {
    if (editItems && editItems.length > 0) {
      // For editing, add description holder as first item if itemized
      if (editItems.length > 1) {
        const totalAmount = editItems.reduce((sum, i) => sum + i.amount, 0);
        return [
          { name: editDescription, amount: totalAmount, splits: [] },
          ...editItems,
        ];
      }
      // Single item - use it as the main expense
      return [{ ...editItems[0], name: editDescription }];
    }
    return [{ name: "", amount: 0, splits: [] }];
  });
  const [{ name: description, amount, splits }, ...rest] = items;
  const isItemized = items.length > 1;

  const handleAddItem = () => {
    setItems([...items, { name: "", amount: 0, splits: [] }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleClearItems = () => {
    const totalAmount = rest.reduce((sum, item) => sum + item.amount, 0);
    setItems([
      {
        name: description,
        amount: totalAmount,
        splits: defaultSplits(totalAmount),
      },
    ]);
  };

  const handleItemChange = (
    index: number,
    field: keyof SubItem,
    value: ValueOf<SubItem>,
  ) => {
    const newItems = [...items];
    newItems[index] =
      field === "amount" && typeof value === "number"
        ? { ...newItems[index], [field]: value, splits: defaultSplits(value) }
        : { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleAmountChange = (value: number) => {
    handleItemChange(0, "amount", value);
  };

  const handleDescriptionChange = (value: string) => {
    handleItemChange(0, "name", value);
  };

  const [activeSplitIndex, setActiveSplitIndex] = useState<number | null>(null);
  const [showSimpleSplitModal, setShowSimpleSplitModal] = useState(false);

  // Zod validation
  const formValidation = useMemo(() => {
    const baseData = {
      description,
      payerId: payer?._id ?? "",
      currency,
    };

    if (isItemized) {
      // Skip first item (description holder) when itemized
      const itemsToValidate = items.slice(1);
      return itemizedExpenseSchema.safeParse({
        ...baseData,
        items: itemsToValidate,
      });
    }
    return simpleExpenseSchema.safeParse({
      ...baseData,
      amount: items[0].amount,
    });
  }, [description, payer, currency, isItemized, items]);

  const isFormValid = formValidation.success;

  const handleSplitSave = (index: number, splits: SplitShare[]) => {
    handleItemChange(index, "splits", splits);
    setActiveSplitIndex(null);
  };

  const handleSimpleSplitSave = (splits: SplitShare[]) => {
    handleItemChange(0, "splits", splits);
    setShowSimpleSplitModal(false);
  };

  const handleSplitCancel = () => {
    setActiveSplitIndex(null);
  };

  const handleSubmit = async (formData: FormData) => {
    console.log("formdata", ...formData);
    const date = new Date(formData.get("date") as string);

    // Prepare items array
    const finalItems = isItemized ? rest : items;
    if (!payer) {
      alert("No payer selected");
      return;
    }
    try {
      if (isEditing && expenseId) {
        await updateExpense({
          expenseId,
          telegramChatId,
          telegramUserId,
          description,
          currency,
          payerId: payer._id,
          items: finalItems,
          date: date.getTime(),
        });
      } else {
        await addExpense({
          telegramChatId,
          telegramUserId,
          description,
          currency,
          payerId: payer._id,
          items: finalItems,
          date: date.getTime(),
        });
      }
      // Navigate back
      router.push(`/app/${telegramUserId}/group/${telegramChatId}`);
    } catch (error) {
      console.error("Failed to save expense:", error);
      // alert("Failed to save expense. Please try again.");
    }
  };

  const handleMainButtonClick = () => {
    submitButtonRef.current?.click();
  };

  if (activeSplitIndex !== null && groupData) {
    const currentItem = items[activeSplitIndex];
    return (
      <SplitModal
        isOpen={true}
        onClose={handleSplitCancel}
        onSave={(splits) => handleSplitSave(activeSplitIndex, splits)}
        amount={currentItem.amount}
        members={groupData.members}
        initialSplits={currentItem.splits}
        itemName={currentItem.name || "Item"}
        currency={currency}
      />
    );
  }

  if (showSimpleSplitModal && groupData) {
    return (
      <SplitModal
        isOpen={true}
        onClose={() => setShowSimpleSplitModal(false)}
        onSave={handleSimpleSplitSave}
        amount={amount}
        members={groupData.members}
        initialSplits={[]}
        itemName={description || "Expense"}
        currency={currency}
      />
    );
  }

  // TODO: incoporate react hook form to prevent excessive re-renders

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => router.back()} type="button">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? "Edit Expense" : "Add Expense"}
          </h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <form className="space-y-2">
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              required
              placeholder="e.g., Dinner at restaurant"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [&:user-invalid]:border-red-500 focus:[&:user-invalid]:ring-red-500"
            />
          </div>

          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Date
            </label>
            <div className="relative">
              <input
                type="date"
                id="date"
                name="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none [&:user-invalid]:border-red-500 focus:[&:user-invalid]:ring-red-500"
              />
              <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Amount
            </label>
            <div className="flex items-center justify-center rounded-xl bg-white dark:bg-gray-700 pl-3 outline outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 has-[:focus-within]:outline-2 has-[:focus-within]:-outline-offset-2 has-[:focus-within]:outline-blue-500 has-[input:user-invalid]:outline-red-500">
              <div className="shrink-0 text-base text-gray-500 dark:text-gray-400 select-none sm:text-sm/6">
                {currencySymbol}
              </div>
              <CurrencyInput
                id="amount"
                value={
                  isItemized
                    ? rest.reduce((sum, i) => sum + i.amount, 0)
                    : amount
                }
                onValueChange={handleAmountChange}
                readOnly={isItemized}
                required
                placeholder="0.00"
              />
              <div className="grid shrink-0 grid-cols-1 focus-within:relative border-l border-gray-300 dark:border-gray-600 ml-2">
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="col-start-1 row-start-1 w-full appearance-none rounded-r-xl py-3 pr-7 pl-3 text-base text-gray-500 dark:text-gray-400 placeholder:text-gray-500 focus:outline-none sm:text-sm/6 bg-transparent"
                  aria-label="Currency"
                >
                  <CurrencyDropdownOptions />
                </select>
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  data-slot="icon"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 dark:text-gray-400 sm:size-4"
                >
                  <path
                    d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
          {payer && (
            <div>
              <label
                htmlFor="payer"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Paid by
              </label>
              <select
                id="payer"
                value={payer?._id}
                onChange={(e) => {
                  const member = groupData?.members.find(
                    (m) => m._id === e.target.value,
                  );
                  if (member) {
                    setPayer(member);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all [&:user-invalid]:border-red-500 focus:[&:user-invalid]:ring-red-500"
              >
                {groupData?.members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isItemized && (
            <div className="flex-1">
              <button
                type="button"
                onClick={() => setShowSimpleSplitModal(true)}
                className="w-full px-4 py-3 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
              >
                <Split className="w-5 h-5" />
                {splits.length > 0
                  ? `Split among ${splits.length} people`
                  : "Split Expense"}
              </button>
            </div>
          )}

          {/* Items Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {isItemized && "Items & Splits"}
              </div>
              {!isItemized ? (
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Itemize Expense
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleClearItems}
                  className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Delete All
                </button>
              )}
            </div>

            {isItemized &&
              rest.map((item, index) => (
                <div
                  // TODO generate temp unique id for each item to avoid re-rendering when items are added/removed
                  // biome-ignore lint/suspicious/noArrayIndexKey: anonymous item does not need a key
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3"
                >
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(index + 1, "name", e.target.value)
                        }
                        placeholder="Item name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white [&:user-invalid]:border-red-500 focus:[&:user-invalid]:ring-red-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleRemoveItem(index + 1);
                      }}
                      className="p-2 hover:text-gray-400 hover:bg-red-500 text-red-500 transition-colors bg-white dark:bg-gray-700 rounded-lg border border-red-200 dark:border-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex items-center justify-center rounded-lg bg-white dark:bg-gray-700 pl-3 outline outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-600 has-[:focus-within]:outline-2 has-[:focus-within]:-outline-offset-2 has-[:focus-within]:outline-blue-500 has-[input:user-invalid]:outline-red-500 w-auto">
                      <div className="shrink-0 text-gray-500 dark:text-gray-400 select-none sm:text-sm/6 text-center">
                        {currencySymbol}
                      </div>
                      <CurrencyInput
                        required
                        value={item.amount}
                        onValueChange={(val) =>
                          handleItemChange(index + 1, "amount", val)
                        }
                        placeholder="0.00"
                        className="w-1/2 pr-3 pl-1 py-2 text-sm rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSplitIndex(index + 1)}
                      className="flex-3 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Split className="w-4 h-4" />
                      {item.splits.length > 0
                        ? `${item.splits.length} people`
                        : "Split"}
                    </button>
                    {/* </div> */}
                  </div>
                </div>
              ))}

            {isItemized && (
              <button
                type="button"
                onClick={() => {
                  handleAddItem();
                }}
                className="w-full py-3 text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Plus className="w-5 h-5" /> Add Another Item
              </button>
            )}
          </div>
          <button
            type="submit"
            ref={submitButtonRef}
            formAction={handleSubmit}
            className="hidden w-full py-3 text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Submit
          </button>

          {/* Link Main Button to Submit Button */}
          <MainButton
            text={isEditing ? "Update Expense" : "Save Expense"}
            onClick={handleMainButtonClick}
            ready={isFormValid}
            show={isFormValid}
          />
        </form>
      </div>
    </div>
  );
}
