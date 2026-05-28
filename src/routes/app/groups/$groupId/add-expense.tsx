import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import type { FunctionReturnType } from "convex/server";
import {
	ArrowLeft,
	Calendar,
	Check,
	Plus,
	Split,
	Trash2,
	X,
} from "lucide-solid";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	Show,
	untrack,
} from "solid-js";
import { z } from "zod";

import { TelegramMainButton } from "#/components/telegram-main-button";
import { Button } from "#/components/ui/button";
import { CurrencyInput } from "#/components/ui/currency-input";
import Loading from "#/components/ui/loading";
import { CurrencyDropdownOptions, currencySigns } from "#/currencies";
import { useMutation, useQuery } from "#/solid-convex";
import { useTelegramLaunch } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type EditExpenseSearchParams = {
	expenseId: string | null;
	description: string;
	currency: string | null;
	payerId: string | null;
	date: string | null;
	items: string | null;
};

export const Route = createFileRoute("/app/groups/$groupId/add-expense")({
	validateSearch: (search): EditExpenseSearchParams => ({
		currency: stringSearchParam(search.currency),
		date: stringSearchParam(search.date),
		description: stringSearchParam(search.description) ?? "",
		expenseId: stringSearchParam(search.expenseId),
		items: stringSearchParam(search.items),
		payerId: stringSearchParam(search.payerId),
	}),
	component: AddExpenseRoute,
});

type GroupData = NonNullable<
	FunctionReturnType<typeof api.groups.getListOfExpenses>
>;

const splitShareSchema = z.object({
	amount: z.number().nonnegative(),
	userId: z.string().min(1),
});

const subItemSchema = z.object({
	amount: z.number().positive("Amount must be greater than 0"),
	name: z.string().min(1, "Item name is required"),
	splits: z.array(splitShareSchema),
});

const baseExpenseSchema = z.object({
	currency: z.string().min(1),
	description: z.string().min(1, "Description is required"),
	payerId: z.string().min(1, "Payer is required"),
});

const simpleExpenseSchema = baseExpenseSchema.extend({
	amount: z.number().positive("Amount must be greater than 0"),
});

const itemizedExpenseSchema = baseExpenseSchema.extend({
	items: z.array(subItemSchema).min(1, "At least one item is required"),
});

type SplitType = "equal" | "exact" | "percentage" | "shares";

type SplitShare = {
	userId: Id<"users">;
	amount: number;
};

type SubItem = {
	name: string;
	amount: number;
	splits: SplitShare[];
};

function AddExpenseRoute() {
	const params = Route.useParams();
	const search = Route.useSearch();
	const { groupId } = params();
	const telegramChatId = Number(groupId);
	const { telegramUserId } = useTelegramLaunch();

	if (Number.isNaN(telegramChatId)) {
		return <Loading message="Invalid group." />;
	}

	return (
		<Show
			when={telegramUserId()}
			fallback={<Loading message="Loading page..." />}
		>
			{(currentTelegramUserId) => (
				<AddExpenseData
					searchParams={search()}
					telegramChatId={telegramChatId}
					telegramUserId={currentTelegramUserId()}
				/>
			)}
		</Show>
	);
}

function AddExpenseData(props: {
	searchParams: EditExpenseSearchParams;
	telegramChatId: number;
	telegramUserId: number;
}) {
	const groupData = useQuery(api.groups.getListOfExpenses, {
		telegramChatId: props.telegramChatId,
	});

	return (
		<Show when={groupData()} fallback={<Loading message="Loading page..." />}>
			{(data) => (
				<EditExpensePage
					groupData={data()}
					searchParams={props.searchParams}
					telegramChatId={props.telegramChatId}
					telegramUserId={props.telegramUserId}
				/>
			)}
		</Show>
	);
}

function SplitModal(props: {
	amount: number;
	currency: string;
	initialSplits: SplitShare[];
	itemName: string;
	members: Doc<"users">[];
	onClose: () => void;
	onSave: (splits: SplitShare[]) => void;
}) {
	const [splitType, setSplitType] = createSignal<SplitType>("equal");
	const [splits, setSplits] = createSignal<SplitShare[]>(props.initialSplits);
	const [selectedUsers, setSelectedUsers] = createSignal<string[]>(
		props.initialSplits.length > 0
			? props.initialSplits.map((split) => split.userId)
			: props.members.map((member) => member._id),
	);
	const [percentages, setPercentages] = createSignal<Record<string, number>>(
		{},
	);
	const [shares, setShares] = createSignal<Record<string, number>>({});
	const [validationError, setValidationError] = createSignal<string | null>(
		null,
	);

	const orderedSelectedUsers = createMemo(() =>
		props.members
			.filter((member) => selectedUsers().includes(member._id))
			.map((member) => member._id),
	);
	const lastSelectedUserId = createMemo(
		() => orderedSelectedUsers()[orderedSelectedUsers().length - 1],
	);

	createEffect(() => {
		const userIds = orderedSelectedUsers();
		const userCount = userIds.length;
		if (userCount === 0) return;

		if (splitType() === "equal") {
			const splitAmount = props.amount / userCount;
			setSplits(
				userIds.map((userId) => ({
					amount: splitAmount,
					userId,
				})),
			);
		} else if (splitType() === "exact") {
			setSplits((previous) =>
				userIds.map((userId) => {
					const existing = previous.find((split) => split.userId === userId);
					return { amount: existing?.amount ?? 0, userId };
				}),
			);
		} else if (splitType() === "percentage") {
			const equalPercent = 100 / userCount;
			setPercentages((previous) => {
				const next: Record<string, number> = {};
				for (const userId of userIds) {
					next[userId] = previous[userId] ?? equalPercent;
				}
				return next;
			});
			setSplits((previous) =>
				userIds.map((userId) => {
					const existing = previous.find((split) => split.userId === userId);
					return {
						amount: existing?.amount ?? props.amount / userCount,
						userId,
					};
				}),
			);
		} else {
			setShares((previous) => {
				const next: Record<string, number> = {};
				for (const userId of userIds) {
					next[userId] = previous[userId] ?? 1;
				}
				return next;
			});
			setSplits(
				userIds.map((userId) => ({
					amount: props.amount / userCount,
					userId,
				})),
			);
		}
		setValidationError(null);
	});

	const getExactAmountForUser = (userId: string) => {
		if (userId === lastSelectedUserId()) {
			const otherUsersTotal = splits()
				.filter(
					(split) =>
						split.userId !== lastSelectedUserId() &&
						selectedUsers().includes(split.userId),
				)
				.reduce((sum, split) => sum + split.amount, 0);
			return Math.max(0, props.amount - otherUsersTotal);
		}
		return splits().find((split) => split.userId === userId)?.amount ?? 0;
	};

	const getPercentageForUser = (userId: string) => {
		if (userId === lastSelectedUserId()) {
			const otherUsersTotal = Object.entries(percentages())
				.filter(
					([id]) => id !== lastSelectedUserId() && selectedUsers().includes(id),
				)
				.reduce((sum, [, percentage]) => sum + percentage, 0);
			return Math.max(0, 100 - otherUsersTotal);
		}
		return percentages()[userId] ?? 0;
	};

	const getSharesForUser = (userId: string) => shares()[userId] ?? 1;
	const getTotalShares = () =>
		selectedUsers().reduce((sum, userId) => sum + getSharesForUser(userId), 0);
	const getAmountFromShares = (userId: string) => {
		const totalShares = getTotalShares();
		return totalShares === 0
			? 0
			: (getSharesForUser(userId) / totalShares) * props.amount;
	};

	const toggleUser = (userId: string) => {
		setSelectedUsers((current) =>
			current.includes(userId)
				? current.filter((id) => id !== userId)
				: [...current, userId],
		);
		setValidationError(null);
	};

	const handleExactAmountChange = (userId: string, newAmount: number) => {
		if (userId === lastSelectedUserId()) return;
		setSplits((current) => {
			const updated = current.map((split) =>
				split.userId === userId ? { ...split, amount: newAmount } : split,
			);
			if (!updated.find((split) => split.userId === userId)) {
				updated.push({ amount: newAmount, userId: userId as Id<"users"> });
			}
			return updated;
		});
		setValidationError(null);
	};

	const handlePercentageChange = (userId: string, newPercent: number) => {
		if (userId === lastSelectedUserId()) return;
		const nextPercentages = { ...percentages(), [userId]: newPercent };
		setPercentages(nextPercentages);
		setSplits(
			selectedUsers().map((selectedUserId) => {
				const percent =
					selectedUserId === lastSelectedUserId()
						? Math.max(
								0,
								100 -
									Object.entries(nextPercentages)
										.filter(
											([id]) =>
												id !== lastSelectedUserId() &&
												selectedUsers().includes(id),
										)
										.reduce((sum, [, percentage]) => sum + percentage, 0),
							)
						: (nextPercentages[selectedUserId] ?? 0);
				return {
					amount: (percent / 100) * props.amount,
					userId: selectedUserId as Id<"users">,
				};
			}),
		);
		setValidationError(null);
	};

	const handleSharesChange = (userId: string, newShareCount: number) => {
		const validShares = Math.max(0, Math.floor(newShareCount));
		const nextShares = { ...shares(), [userId]: validShares };
		setShares(nextShares);

		const totalShares = selectedUsers().reduce(
			(sum, selectedUserId) => sum + (nextShares[selectedUserId] ?? 1),
			0,
		);
		if (totalShares > 0) {
			setSplits(
				selectedUsers().map((selectedUserId) => ({
					amount:
						((nextShares[selectedUserId] ?? 1) / totalShares) * props.amount,
					userId: selectedUserId as Id<"users">,
				})),
			);
		}
		setValidationError(null);
	};

	const getFinalSplits = (): SplitShare[] => {
		if (splitType() === "equal") return splits();
		if (splitType() === "exact") {
			return selectedUsers().map((userId) => ({
				amount: getExactAmountForUser(userId),
				userId: userId as Id<"users">,
			}));
		}
		if (splitType() === "percentage") {
			return selectedUsers().map((userId) => ({
				amount: (getPercentageForUser(userId) / 100) * props.amount,
				userId: userId as Id<"users">,
			}));
		}
		return selectedUsers().map((userId) => ({
			amount: getAmountFromShares(userId),
			userId: userId as Id<"users">,
		}));
	};

	const validateSplits = () => {
		const finalSplits = getFinalSplits();
		if (finalSplits.some((split) => split.amount < 0)) {
			setValidationError("All amounts must be positive");
			return false;
		}

		const total = finalSplits.reduce((sum, split) => sum + split.amount, 0);
		if (Math.abs(total - props.amount) > 0.01) {
			setValidationError(
				`Total (${total.toFixed(2)}) doesn't match expense amount (${props.amount.toFixed(2)})`,
			);
			return false;
		}

		if (splitType() === "percentage") {
			const totalPercent = selectedUsers().reduce(
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

		if (splitType() === "shares" && getTotalShares() <= 0) {
			setValidationError("Total shares must be greater than 0");
			return false;
		}

		setValidationError(null);
		return true;
	};

	const handleSave = () => {
		if (!validateSplits()) return;
		props.onSave(getFinalSplits());
	};

	const totalAssigned = createMemo(() =>
		getFinalSplits().reduce((sum, split) => sum + split.amount, 0),
	);
	const totalPercent = createMemo(() =>
		splitType() === "percentage"
			? selectedUsers().reduce(
					(sum, userId) => sum + getPercentageForUser(userId),
					0,
				)
			: 0,
	);
	const totalSharesDisplay = createMemo(() =>
		splitType() === "shares" ? getTotalShares() : 0,
	);

	return (
		<div class="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
			<div class="my-8 w-full max-w-md rounded-sm bg-white shadow-xl dark:bg-gray-900">
				<div class="flex items-center justify-between border-gray-200 border-b p-5 dark:border-gray-800">
					<div>
						<h2 class="font-semibold text-gray-900 text-xl dark:text-white">
							Split Expense
						</h2>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{props.itemName} - {props.amount.toFixed(2)} {props.currency}
						</p>
					</div>
					<button
						class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
						type="button"
						onClick={props.onClose}
					>
						<X class="h-6 w-6" />
					</button>
				</div>

				<div class="space-y-4 p-5">
					<div class="grid grid-cols-4 gap-1 rounded-sm bg-slate-100 p-1 dark:bg-gray-800">
						<For each={["equal", "exact", "percentage", "shares"] as const}>
							{(type) => (
								<button
									class={`rounded-sm py-1.5 font-medium text-sm transition-colors ${
										splitType() === type
											? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
											: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
									}`}
									type="button"
									onClick={() => setSplitType(type)}
								>
									{type === "percentage"
										? "%"
										: type.charAt(0).toUpperCase() + type.slice(1)}
								</button>
							)}
						</For>
					</div>

					<div class="max-h-60 space-y-2 overflow-y-auto">
						<For each={props.members}>
							{(member) => {
								const isSelected = () => selectedUsers().includes(member._id);
								const isLastUser = () => member._id === lastSelectedUserId();

								return (
									<div class="flex items-center justify-between rounded-sm border border-gray-200 bg-slate-50 p-3 dark:border-gray-800 dark:bg-gray-950">
										<div class="flex items-center gap-3">
											<button
												class={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm border ${
													isSelected()
														? "border-cyan-600 bg-cyan-600 text-white"
														: "border-gray-300 dark:border-gray-600"
												}`}
												type="button"
												onClick={() => toggleUser(member._id)}
											>
												<Show when={isSelected()}>
													<Check class="h-3 w-3" />
												</Show>
											</button>
											<span class="text-sm font-medium text-gray-900 dark:text-white">
												{member.firstName} {member.lastName}
											</span>
										</div>

										<Show when={isSelected()}>
											<div class="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-white">
												<SplitAmountControl
													amount={props.amount}
													currency={props.currency}
													getAmountFromShares={getAmountFromShares}
													getExactAmountForUser={getExactAmountForUser}
													getPercentageForUser={getPercentageForUser}
													getSharesForUser={getSharesForUser}
													handleExactAmountChange={handleExactAmountChange}
													handlePercentageChange={handlePercentageChange}
													handleSharesChange={handleSharesChange}
													isLastUser={isLastUser()}
													memberId={member._id}
													selectedUsersCount={selectedUsers().length}
													splitType={splitType()}
												/>
											</div>
										</Show>
									</div>
								);
							}}
						</For>
					</div>

					<div class="border-gray-200 border-t pt-4 dark:border-gray-800">
						<Show when={splitType() === "percentage"}>
							<div class="mb-2 flex justify-between text-sm font-medium">
								<span class="text-gray-500 dark:text-gray-400">
									Total percentage:
								</span>
								<span
									class={
										Math.abs(totalPercent() - 100) < 0.01
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400"
									}
								>
									{totalPercent().toFixed(1)}%
								</span>
							</div>
						</Show>
						<Show when={splitType() === "shares"}>
							<div class="mb-2 flex justify-between text-sm font-medium">
								<span class="text-gray-500 dark:text-gray-400">
									Total shares:
								</span>
								<span
									class={
										totalSharesDisplay() > 0
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400"
									}
								>
									{totalSharesDisplay()}
								</span>
							</div>
						</Show>
						<div class="mb-2 flex justify-between text-sm font-medium">
							<span class="text-gray-500 dark:text-gray-400">
								Total assigned:
							</span>
							<span
								class={
									Math.abs(totalAssigned() - props.amount) < 0.01
										? "text-green-600 dark:text-green-400"
										: "text-red-600 dark:text-red-400"
								}
							>
								{totalAssigned().toFixed(2)} / {props.amount.toFixed(2)}{" "}
								{props.currency}
							</span>
						</div>
						<Show when={validationError()}>
							{(error) => (
								<div class="mb-3 rounded-sm border border-red-200 bg-red-50 p-2 dark:border-red-900/70 dark:bg-red-950/30">
									<p class="text-sm text-red-600 dark:text-red-400">
										{error()}
									</p>
								</div>
							)}
						</Show>
						<div class="flex gap-3">
							<Button
								class="flex-1 bg-slate-200 text-gray-900 hover:bg-slate-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
								onClick={props.onClose}
							>
								Cancel
							</Button>
							<Button
								class="flex-1 bg-gray-950 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
								disabled={Math.abs(totalAssigned() - props.amount) > 0.01}
								onClick={handleSave}
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

function SplitAmountControl(props: {
	amount: number;
	currency: string;
	getAmountFromShares: (userId: string) => number;
	getExactAmountForUser: (userId: string) => number;
	getPercentageForUser: (userId: string) => number;
	getSharesForUser: (userId: string) => number;
	handleExactAmountChange: (userId: string, value: number) => void;
	handlePercentageChange: (userId: string, value: number) => void;
	handleSharesChange: (userId: string, value: number) => void;
	isLastUser: boolean;
	memberId: string;
	selectedUsersCount: number;
	splitType: SplitType;
}) {
	return (
		<Show
			when={props.splitType === "exact"}
			fallback={
				<Show
					when={props.splitType === "percentage"}
					fallback={
						<Show
							when={props.splitType === "shares"}
							fallback={
								<span>
									{(props.amount / props.selectedUsersCount).toFixed(2)}{" "}
									{props.currency}
								</span>
							}
						>
							<div class="flex items-center gap-2">
								<input
									class="w-14 rounded-sm border border-gray-300 bg-white px-2 py-1 text-right dark:border-gray-700 dark:bg-gray-900"
									min="0"
									step="1"
									type="number"
									value={props.getSharesForUser(props.memberId)}
									onInput={(event) =>
										props.handleSharesChange(
											props.memberId,
											Number.parseInt(event.currentTarget.value, 10) || 0,
										)
									}
								/>
								<span class="text-gray-400 text-xs">
									= {props.getAmountFromShares(props.memberId).toFixed(2)}{" "}
									{props.currency}
								</span>
							</div>
						</Show>
					}
				>
					<Show
						when={props.isLastUser}
						fallback={
							<div class="flex items-center gap-1">
								<input
									class="w-16 rounded-sm border border-gray-300 bg-white px-2 py-1 text-right dark:border-gray-700 dark:bg-gray-900"
									max="100"
									min="0"
									placeholder="0"
									step="0.1"
									type="number"
									value={props.getPercentageForUser(props.memberId) || ""}
									onInput={(event) =>
										props.handlePercentageChange(
											props.memberId,
											Number.parseFloat(event.currentTarget.value) || 0,
										)
									}
								/>
								<span class="text-gray-400 text-xs">%</span>
							</div>
						}
					>
						<span class="rounded-sm bg-cyan-50 px-2 py-1 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
							{props.getPercentageForUser(props.memberId).toFixed(1)}%
						</span>
					</Show>
				</Show>
			}
		>
			<Show
				when={props.isLastUser}
				fallback={
					<div class="flex items-center gap-1">
						<CurrencyInput
							class="w-20 rounded-sm border border-gray-300 bg-white px-2 py-1 text-right dark:border-gray-700 dark:bg-gray-900"
							placeholder="0.00"
							value={props.getExactAmountForUser(props.memberId)}
							onValueChange={(value) =>
								props.handleExactAmountChange(props.memberId, value)
							}
						/>
						<span class="text-gray-400 text-xs">{props.currency}</span>
					</div>
				}
			>
				<span class="rounded-sm bg-cyan-50 px-2 py-1 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">
					{props.getExactAmountForUser(props.memberId).toFixed(2)}{" "}
					{props.currency}
				</span>
			</Show>
		</Show>
	);
}

function EditExpensePage(props: {
	groupData: GroupData;
	searchParams: EditExpenseSearchParams;
	telegramChatId: number;
	telegramUserId: number;
}) {
	const navigate = useNavigate();
	const addExpense = useMutation(api.groups.addExpense);
	const updateExpense = useMutation(api.groups.updateExpense);
	const expenseId = props.searchParams.expenseId as Id<"expenses"> | null;
	const isEditing = () => expenseId !== null;
	const editItems = parseEditItems(props.searchParams.items);
	const editDescription = props.searchParams.description;
	const editCurrency =
		props.searchParams.currency || props.groupData.defaultCurrency || "USD";
	const editPayerId = props.searchParams.payerId as Id<"users"> | null;
	let submitButtonRef: HTMLButtonElement | undefined;

	const defaultSplits = (amount: number): SplitShare[] =>
		props.groupData.members.map((member) => ({
			amount: amount / props.groupData.members.length || 0,
			userId: member._id,
		}));

	const [currency, setCurrency] = createSignal(editCurrency);
	const currencySymbol = createMemo(() => currencySigns[currency()] || "$");
	const [payer, setPayer] = createSignal<Doc<"users"> | null>(
		editPayerId
			? (props.groupData.members.find((member) => member._id === editPayerId) ??
					null)
			: (props.groupData.members.find(
					(member) => member.telegramUserId === props.telegramUserId,
				) ?? null),
	);
	const [date, setDate] = createSignal(
		props.searchParams.date
			? new Date(Number(props.searchParams.date)).toISOString().split("T")[0]
			: new Date().toISOString().split("T")[0],
	);
	const [items, setItems] = createSignal<SubItem[]>(
		createInitialItems(editItems, editDescription),
	);
	const [activeSplitIndex, setActiveSplitIndex] = createSignal<number | null>(
		null,
	);
	const [showSimpleSplitModal, setShowSimpleSplitModal] = createSignal(false);

	createEffect(() => {
		if (payer() !== null) return;
		const selectedPayer =
			editPayerId !== null
				? props.groupData.members.find((member) => member._id === editPayerId)
				: props.groupData.members.find(
						(member) => member.telegramUserId === props.telegramUserId,
					);
		setPayer(selectedPayer ?? null);
	});

	const firstItem = createMemo(
		() => items()[0] ?? { amount: 0, name: "", splits: [] },
	);
	const rest = createMemo(() => items().slice(1));
	const description = () => firstItem().name;
	const amount = () => firstItem().amount;
	const splits = () => firstItem().splits;
	const isItemized = () => items().length > 1;

	const handleAddItem = () => {
		setItems((current) => [...current, { amount: 0, name: "", splits: [] }]);
	};

	const handleRemoveItem = (index: number) => {
		setItems((current) =>
			current.length > 1
				? current.filter((_, itemIndex) => itemIndex !== index)
				: current,
		);
	};

	const handleClearItems = () => {
		const totalAmount = rest().reduce((sum, item) => sum + item.amount, 0);
		setItems([
			{
				amount: totalAmount,
				name: description(),
				splits: defaultSplits(totalAmount),
			},
		]);
	};

	const handleItemChange = <Key extends keyof SubItem>(
		index: number,
		field: Key,
		value: SubItem[Key],
	) => {
		setItems((current) =>
			current.map((item, itemIndex) => {
				if (itemIndex !== index) return item;
				if (field === "amount" && typeof value === "number") {
					return {
						...item,
						amount: value,
						splits: defaultSplits(value),
					};
				}
				return { ...item, [field]: value };
			}),
		);
	};

	const formValidation = createMemo(() => {
		const baseData = {
			currency: currency(),
			description: description(),
			payerId: payer()?._id ?? "",
		};

		if (isItemized()) {
			return itemizedExpenseSchema.safeParse({
				...baseData,
				items: items().slice(1),
			});
		}
		return simpleExpenseSchema.safeParse({
			...baseData,
			amount: firstItem().amount,
		});
	});

	const isFormValid = () => formValidation().success;

	const handleSplitSave = (index: number, nextSplits: SplitShare[]) => {
		handleItemChange(index, "splits", nextSplits);
		setActiveSplitIndex(null);
	};

	const handleSubmit: JSX.EventHandler<HTMLFormElement, SubmitEvent> = async (
		event,
	) => {
		event.preventDefault();
		const selectedPayer = payer();
		if (!selectedPayer) {
			alert("No payer selected");
			return;
		}

		const finalItems = isItemized() ? rest() : items();

		try {
			if (isEditing() && expenseId) {
				await updateExpense({
					currency: currency(),
					date: new Date(date()).getTime(),
					description: description(),
					expenseId,
					items: finalItems,
					payerId: selectedPayer._id,
					telegramChatId: props.telegramChatId,
					telegramUserId: props.telegramUserId,
				});
			} else {
				await addExpense({
					currency: currency(),
					date: new Date(date()).getTime(),
					description: description(),
					items: finalItems,
					payerId: selectedPayer._id,
					telegramChatId: props.telegramChatId,
					telegramUserId: props.telegramUserId,
				});
			}

			void navigate({
				params: {
					groupId: String(props.telegramChatId),
				},
				to: "/app/groups/$groupId",
			});
		} catch (error) {
			console.error("Failed to save expense:", error);
			alert("Failed to save expense. Please try again.");
		}
	};

	const activeSplitItem = createMemo(() => {
		const index = activeSplitIndex();
		return index === null ? null : (items()[index] ?? null);
	});

	return (
		<div class="min-h-screen bg-slate-50 pb-20 text-gray-950 dark:bg-gray-950 dark:text-white">
			<div class="sticky top-0 z-10 border-gray-200 border-b bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
				<div class="mx-auto flex max-w-2xl items-center gap-4 p-4">
					<button
						class="rounded-sm border border-gray-200 bg-white p-2 transition-colors hover:border-cyan-500 dark:border-gray-800 dark:bg-gray-900"
						type="button"
						onClick={() =>
							void navigate({
								params: {
									groupId: String(props.telegramChatId),
								},
								to: "/app/groups/$groupId",
							})
						}
					>
						<ArrowLeft class="h-4 w-4" />
					</button>
					<h1 class="font-semibold text-gray-900 text-xl dark:text-white">
						{isEditing() ? "Edit Expense" : "Add Expense"}
					</h1>
				</div>
			</div>

			<div class="mx-auto max-w-2xl p-4">
				<form class="space-y-4" onSubmit={handleSubmit}>
					<div class="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
						<label
							class="mb-2 block font-medium text-gray-700 text-sm dark:text-gray-300"
							for="description"
						>
							Description
						</label>
						<input
							class="w-full rounded-sm border border-gray-300 bg-white px-3 py-3 text-gray-900 placeholder-gray-400 transition-all focus:border-cyan-600 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white [&:user-invalid]:border-red-500"
							id="description"
							placeholder="e.g., Dinner at restaurant"
							required
							type="text"
							value={description()}
							onInput={(event) =>
								handleItemChange(0, "name", event.currentTarget.value)
							}
						/>
					</div>

					<div class="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
						<label
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
							for="date"
						>
							Date
						</label>
						<div class="relative">
							<input
								class="w-full appearance-none rounded-sm border border-gray-300 bg-white px-3 py-3 text-gray-900 placeholder-gray-400 transition-all focus:border-cyan-600 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white [&:user-invalid]:border-red-500"
								id="date"
								max={new Date().toISOString().split("T")[0]}
								name="date"
								required
								type="date"
								value={date()}
								onInput={(event) => setDate(event.currentTarget.value)}
							/>
							<Calendar class="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
						</div>
					</div>

					<div class="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
						<label
							class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
							for="amount"
						>
							Amount
						</label>
						<div class="flex items-center justify-center rounded-sm bg-white pl-3 outline outline-1 -outline-offset-1 outline-gray-300 has-[:focus-within]:outline-cyan-600 has-[input:user-invalid]:outline-red-500 dark:bg-gray-950 dark:outline-gray-700">
							<div class="shrink-0 select-none text-base text-gray-500 dark:text-gray-400 sm:text-sm/6">
								{currencySymbol()}
							</div>
							<CurrencyInput
								id="amount"
								placeholder="0.00"
								readOnly={isItemized()}
								required
								value={
									isItemized()
										? rest().reduce((sum, item) => sum + item.amount, 0)
										: amount()
								}
								onValueChange={(value) => handleItemChange(0, "amount", value)}
							/>
							<div class="grid shrink-0 grid-cols-1 border-gray-300 border-l focus-within:relative dark:border-gray-600">
								<select
									aria-label="Currency"
									class="col-start-1 row-start-1 w-full appearance-none rounded-r-sm bg-transparent py-3 pr-7 pl-3 text-base text-gray-500 placeholder:text-gray-500 focus:outline-none dark:text-gray-400 sm:text-sm/6"
									id="currency"
									value={currency()}
									onChange={(event) => setCurrency(event.currentTarget.value)}
								>
									<CurrencyDropdownOptions />
								</select>
								<svg
									aria-hidden="true"
									class="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 dark:text-gray-400 sm:size-4"
									data-slot="icon"
									fill="currentColor"
									viewBox="0 0 16 16"
								>
									<path
										clip-rule="evenodd"
										d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
										fill-rule="evenodd"
									/>
								</svg>
							</div>
						</div>
					</div>

					<Show when={payer()}>
						{(selectedPayer) => (
							<div class="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
								<label
									class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
									for="payer"
								>
									Paid by
								</label>
								<select
									class="w-full appearance-none rounded-sm border border-gray-300 bg-white px-3 py-3 text-gray-900 transition-all focus:border-cyan-600 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white [&:user-invalid]:border-red-500"
									id="payer"
									value={selectedPayer()._id}
									onChange={(event) => {
										const member = props.groupData.members.find(
											(groupMember) =>
												groupMember._id === event.currentTarget.value,
										);
										if (member) setPayer(member);
									}}
								>
									<For each={props.groupData.members}>
										{(member) => (
											<option value={member._id}>
												{member.firstName} {member.lastName}
											</option>
										)}
									</For>
								</select>
							</div>
						)}
					</Show>

					<Show when={!isItemized()}>
						<div class="flex-1">
							<button
								class="flex w-full items-center justify-center gap-2 rounded-sm border border-cyan-200 bg-cyan-50 px-4 py-3 text-cyan-700 text-sm transition-all hover:bg-cyan-100 dark:border-cyan-900/70 dark:bg-cyan-950/30 dark:text-cyan-300"
								type="button"
								onClick={() => setShowSimpleSplitModal(true)}
							>
								<Split class="h-5 w-5" />
								{splits().length > 0
									? `Split among ${splits().length} people`
									: "Split Expense"}
							</button>
						</div>
					</Show>

					<div class="space-y-3 pt-1">
						<div class="flex items-center justify-between">
							<div class="block text-sm font-medium text-gray-700 dark:text-gray-300">
								<Show when={isItemized()}>Items & Splits</Show>
							</div>
							<Show
								when={!isItemized()}
								fallback={
									<button
										class="flex items-center gap-1 font-medium text-red-600 text-sm hover:text-red-700"
										type="button"
										onClick={handleClearItems}
									>
										<Trash2 class="h-4 w-4" /> Delete All
									</button>
								}
							>
								<button
									class="flex items-center gap-1 font-medium text-cyan-700 text-sm hover:text-cyan-800 dark:text-cyan-300"
									type="button"
									onClick={handleAddItem}
								>
									<Plus class="h-4 w-4" /> Itemize Expense
								</button>
							</Show>
						</div>

						<Show when={isItemized()}>
							<For each={rest()}>
								{(item, index) => (
									<div class="space-y-3 rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
										<div class="flex items-start gap-3">
											<div class="flex-1 space-y-3">
												<input
													class="w-full rounded-sm border border-gray-300 bg-white px-3 py-2 text-gray-900 text-sm focus:border-cyan-600 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white [&:user-invalid]:border-red-500"
													placeholder="Item name"
													required
													type="text"
													value={item.name}
													onInput={(event) =>
														handleItemChange(
															index() + 1,
															"name",
															event.currentTarget.value,
														)
													}
												/>
											</div>
											<button
												class="rounded-sm border border-red-200 bg-white p-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/70 dark:bg-gray-950"
												type="button"
												onClick={() => handleRemoveItem(index() + 1)}
											>
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
										<div class="flex items-start gap-3">
											<div class="flex w-auto items-center justify-center rounded-sm bg-white pl-3 outline outline-1 -outline-offset-1 outline-gray-300 has-[:focus-within]:outline-cyan-600 has-[input:user-invalid]:outline-red-500 dark:bg-gray-950 dark:outline-gray-700">
												<div class="shrink-0 select-none text-center text-gray-500 dark:text-gray-400 sm:text-sm/6">
													{currencySymbol()}
												</div>
												<CurrencyInput
													class="w-1/2 rounded-sm bg-white py-2 pr-3 pl-1 text-gray-900 text-sm dark:bg-gray-950 dark:text-white"
													placeholder="0.00"
													required
													value={item.amount}
													onValueChange={(value) =>
														handleItemChange(index() + 1, "amount", value)
													}
												/>
											</div>
											<button
												class="flex flex-3 items-center justify-center gap-1 rounded-sm bg-cyan-50 px-3 py-2 text-cyan-700 text-sm transition-colors hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300"
												type="button"
												onClick={() => setActiveSplitIndex(index() + 1)}
											>
												<Split class="h-4 w-4" />
												{item.splits.length > 0
													? `${item.splits.length} people`
													: "Split"}
											</button>
										</div>
									</div>
								)}
							</For>

							<button
								class="flex w-full items-center justify-center gap-2 rounded-sm border border-cyan-200 border-dashed py-3 font-medium text-cyan-700 text-sm transition-colors hover:bg-cyan-50 dark:border-cyan-900/70 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
								type="button"
								onClick={handleAddItem}
							>
								<Plus class="h-5 w-5" /> Add Another Item
							</button>
						</Show>
					</div>

					<button
						class="hidden w-full items-center justify-center gap-2 rounded-sm border border-cyan-200 border-dashed py-3 font-medium text-cyan-700 text-sm transition-colors hover:bg-cyan-50 dark:border-cyan-900/70 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
						ref={(element) => {
							submitButtonRef = element;
						}}
						type="submit"
					>
						Submit
					</button>

					<TelegramMainButton
						ready={isFormValid()}
						show={isFormValid()}
						text={isEditing() ? "Update Expense" : "Save Expense"}
						onClick={() => submitButtonRef?.click()}
					/>
				</form>
			</div>

			<Show when={activeSplitItem()}>
				{(currentItem) => {
					const index = untrack(activeSplitIndex);
					return (
						<SplitModal
							amount={currentItem().amount}
							currency={currency()}
							initialSplits={currentItem().splits}
							itemName={currentItem().name || "Item"}
							members={props.groupData.members}
							onClose={() => setActiveSplitIndex(null)}
							onSave={(nextSplits) => {
								if (index !== null) {
									handleSplitSave(index, nextSplits);
								}
							}}
						/>
					);
				}}
			</Show>

			<Show when={showSimpleSplitModal()}>
				<SplitModal
					amount={amount()}
					currency={currency()}
					initialSplits={splits()}
					itemName={description() || "Expense"}
					members={props.groupData.members}
					onClose={() => setShowSimpleSplitModal(false)}
					onSave={(nextSplits) => {
						handleItemChange(0, "splits", nextSplits);
						setShowSimpleSplitModal(false);
					}}
				/>
			</Show>
		</div>
	);
}

function createInitialItems(
	editItems: SubItem[] | null,
	editDescription: string,
): SubItem[] {
	if (editItems && editItems.length > 0) {
		if (editItems.length > 1) {
			const totalAmount = editItems.reduce((sum, item) => sum + item.amount, 0);
			return [
				{ amount: totalAmount, name: editDescription, splits: [] },
				...editItems,
			];
		}
		return [{ ...editItems[0], name: editDescription }];
	}
	return [{ amount: 0, name: "", splits: [] }];
}

function parseEditItems(rawItems: string | null): SubItem[] | null {
	if (!rawItems) return null;
	try {
		const parsed = JSON.parse(rawItems);
		const result = z.array(subItemSchema).safeParse(parsed);
		return result.success ? (result.data as SubItem[]) : null;
	} catch {
		return null;
	}
}

function stringSearchParam(value: unknown) {
	return typeof value === "string" ? value : null;
}
