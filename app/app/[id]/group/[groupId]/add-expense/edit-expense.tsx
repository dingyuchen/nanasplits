"use client";

import { api } from "@/convex/_generated/api";
import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  X,
  Trash2,
  Split,
  Check,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { useRouter, useParams } from "next/navigation";
import MainButton from "../../../main-button";
import type { ValueOf } from "next/dist/shared/lib/constants";
import CurrencyDropdownOptions, {
  currencySigns,
} from "./currency-dropdown-options";

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

  // Initialize splits when split type changes or users are selected
  useEffect(() => {
    if (splitType === "equal") {
      const splitAmount = amount / selectedUsers.length;
      setSplits(
        selectedUsers.map((userId) => ({
          userId: userId as Id<"users">,
          amount: splitAmount,
        })),
      );
    }
  }, [splitType, selectedUsers, amount]);

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSave = () => {
    onSave(splits);
  };

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
              {itemName} • {amount} {currency}
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
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
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
            {/* Add more split types later */}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map((member) => {
              const isSelected = selectedUsers.includes(member._id);
              const split = splits.find((s) => s.userId === member._id);

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
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {splitType === "equal" ? (
                        `${(amount / selectedUsers.length).toFixed(2)} ${currency}`
                      ) : (
                        <input
                          type="number"
                          value={split?.amount || ""}
                          onChange={(e) => {
                            const newAmount = parseFloat(e.target.value) || 0;
                            const newSplits = splits.map((s) =>
                              s.userId === member._id
                                ? { ...s, amount: newAmount }
                                : s,
                            );
                            if (!splits.find((s) => s.userId === member._id)) {
                              newSplits.push({
                                userId: member._id,
                                amount: newAmount,
                              });
                            }
                            setSplits(newSplits);
                          }}
                          className="w-20 px-2 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between mb-4 text-sm font-medium">
              <span className="text-gray-500 dark:text-gray-400">
                Total assigned:
              </span>
              <span
                className={
                  Math.abs(
                    splits.reduce((sum, s) => sum + s.amount, 0) - amount,
                  ) < 0.01
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {splits.reduce((sum, s) => sum + s.amount, 0).toFixed(2)} /{" "}
                {amount} {currency}
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
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
}: {
  preloadedGroupExpenses: Preloaded<typeof api.groups.getListOfExpenses>;
}) {
  const router = useRouter();
  const params = useParams();

  const telegramUserId = Number(params.id);
  const telegramChatId = Number(params.groupId);

  const addExpense = useMutation(api.groups.addExpense);
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

  const [currency, setCurrency] = useState(selectedCurrency);
  const currencySymbol = currencySigns[currency] || "$";
  const [payer, setPayer] = useState<Doc<"users"> | null>(
    groupData?.members.find((m) => m.telegramUserId === telegramUserId) || null,
  );
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (groupData) {
      const currentUser = groupData.members.find(
        (m) => m.telegramUserId === telegramUserId,
      );
      if (currentUser) {
        setPayer((currentPayer) => currentPayer || currentUser);
      }
    }
  }, [groupData, telegramUserId]);

  const [items, setItems] = useState<SubItem[]>([
    { name: "", amount: 0, splits: [] },
  ]);
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
    // Calculate total amount
    const totalAmount = isItemized
      ? rest.reduce((sum, item) => sum + item.amount, 0)
      : items[0].amount;

    // Prepare items array
    const finalItems = isItemized ? rest : items;
    if (!payer) {
      alert("No payer selected");
      return;
    }
    try {
      await addExpense({
        telegramChatId,
        telegramUserId,
        description,
        amount: totalAmount,
        currency,
        payerId: payer._id,
        items: finalItems,
        date: (() => {
          const [y, m, d] = date.split("-").map(Number);
          return new Date(y, m - 1, d).getTime();
        })(),
      });
      // Navigate back
      router.push(`/app/${telegramUserId}/group/${telegramChatId}`);
    } catch (error) {
      console.error("Failed to add expense:", error);
      // alert("Failed to add expense. Please try again.");
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
            Add Expense
          </h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <form className="space-y-6">
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
              <input
                type="number"
                inputMode="decimal"
                id="amount"
                value={(isItemized
                  ? rest.reduce((sum, i) => sum + i.amount, 0)
                  : amount
                ).toString()}
                onChange={(e) => handleAmountChange(Number(e.target.value))}
                readOnly={isItemized}
                required
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className={`block min-w-0 grow py-3 pr-3 pl-1 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none bg-transparent sm:text-sm/6 ${isItemized ? "opacity-70" : ""}`}
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
                      <div className="flex gap-3">
                        <input
                          type="number"
                          required
                          min="0.01"
                          value={item.amount.toString()}
                          onChange={(e) =>
                            handleItemChange(
                              index + 1,
                              "amount",
                              Number(e.target.value),
                            )
                          }
                          placeholder="Amount"
                          step="0.01"
                          className="w-1/2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white [&:user-invalid]:border-red-500 focus:[&:user-invalid]:ring-red-500"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveSplitIndex(index + 1)}
                          className="flex-1 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1"
                        >
                          <Split className="w-4 h-4" />
                          {item.splits.length > 0
                            ? `${item.splits.length} people`
                            : "Split"}
                        </button>
                      </div>
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
            // onClick={handleSubmit}
            className="hidden w-full py-3 text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            Submit
          </button>

          {/* Link Main Button to Submit Button */}
          <MainButton text="Save" onClick={handleMainButtonClick} />
        </form>
      </div>
    </div>
  );
}
