import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import {
	ArrowLeft,
	Calendar,
	Check,
	Plus,
	Split,
	Trash2,
	X,
} from "lucide-react";
import { type SubmitEvent, useEffect, useRef } from "react";
import { z } from "zod";

import { TelegramMainButton } from "#/components/telegram-main-button";
import { Button } from "#/components/ui/button";
import { CurrencyInput } from "#/components/ui/currency-input";
import Loading from "#/components/ui/loading";
import NotFound from "#/components/ui/not-found";
import { useQuery } from "#/convex-react";
import { CurrencyDropdownOptions, currencySigns } from "#/currencies";
import { useAccessorState } from "#/react-accessor-state";
import { useTelegramLaunchParams } from "#/telegram-launch";
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
	loader: ({ context, params }) => {
		const telegramChatId = Number(params.groupId);
		if (!Number.isNaN(telegramChatId)) {
			void context.queryClient.prefetchQuery(
				convexQuery(api.groups.getListOfExpenses, { telegramChatId }),
			);
		}
	},
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
	const { groupId } = params;
	const telegramChatId = Number(groupId);
	const { telegramUserId } = useTelegramLaunchParams();
	const currentTelegramUserId = telegramUserId();

	if (Number.isNaN(telegramChatId) || currentTelegramUserId === null) {
		return (
			<Loading
				message={
					Number.isNaN(telegramChatId) ? "Invalid group." : "Loading page..."
				}
			/>
		);
	}

	return (
		<AddExpenseData
			searchParams={search}
			telegramChatId={telegramChatId}
			telegramUserId={currentTelegramUserId}
		/>
	);
}

function AddExpenseData(props: {
	searchParams: EditExpenseSearchParams;
	telegramChatId: number;
	telegramUserId: number;
}) {
	const { data, isPending, error } = useQuery(api.groups.getListOfExpenses, {
		telegramChatId: props.telegramChatId,
	});

	if (isPending || !data) {
		return <Loading message="Loading page..." />;
	}

	if (error !== null) {
		console.log(error.message, error.cause);
		return (
			<NotFound
				text="This group is not available for adding expenses."
				title="Group not found"
			/>
		);
	}

	return (
		<EditExpensePage
			groupData={data}
			searchParams={props.searchParams}
			telegramChatId={props.telegramChatId}
			telegramUserId={props.telegramUserId}
		/>
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
	const [splitType, setSplitType] = useAccessorState<SplitType>("equal");
	const [splits, setSplits] = useAccessorState<SplitShare[]>(
		props.initialSplits,
	);
	const [selectedUsers, setSelectedUsers] = useAccessorState<string[]>(
		props.initialSplits.length > 0
			? props.initialSplits.map((split) => split.userId)
			: props.members.map((member) => member._id),
	);
	const [percentages, setPercentages] = useAccessorState<
		Record<string, number>
	>({});
	const [shares, setShares] = useAccessorState<Record<string, number>>({});
	const [validationError, setValidationError] = useAccessorState<string | null>(
		null,
	);

	const orderedSelectedUsers = () =>
		props.members
			.filter((member) => selectedUsers().includes(member._id))
			.map((member) => member._id);
	const lastSelectedUserId = () =>
		orderedSelectedUsers()[orderedSelectedUsers().length - 1];

	useEffect(() => {
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
	}, [props.amount, props.members, selectedUsers().join("|"), splitType()]);

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

	const totalAssigned = () =>
		getFinalSplits().reduce((sum, split) => sum + split.amount, 0);
	const totalPercent = () =>
		splitType() === "percentage"
			? selectedUsers().reduce(
					(sum, userId) => sum + getPercentageForUser(userId),
					0,
				)
			: 0;
	const totalSharesDisplay = () =>
		splitType() === "shares" ? getTotalShares() : 0;

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-stone-900/30 p-4 backdrop-blur-[2px]">
			<div className="my-8 w-full max-w-md rounded-2xl border border-stone-200 bg-white shadow-2xl">
				<div className="flex items-center justify-between border-stone-100 border-b p-5">
					<div>
						<h2 className="font-heading text-stone-900 text-2xl">
							Split Expense
						</h2>
						<p className="text-stone-500 text-sm">
							{props.itemName} - {props.amount.toFixed(2)} {props.currency}
						</p>
					</div>
					<button
						className="rounded-md p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-900"
						type="button"
						onClick={props.onClose}
					>
						<X className="h-6 w-6" />
					</button>
				</div>

				<div className="space-y-4 p-5">
					<div className="grid grid-cols-4 gap-1 rounded-lg bg-stone-100 p-1">
						{(["equal", "exact", "percentage", "shares"] as const).map(
							(type) => (
								<button
									key={type}
									className={`rounded-md py-1.5 font-semibold text-sm transition ${
										splitType() === type
											? "bg-white text-stone-900 shadow-sm"
											: "text-stone-500 hover:text-stone-900"
									}`}
									type="button"
									onClick={() => setSplitType(type)}
								>
									{type === "percentage"
										? "%"
										: type.charAt(0).toUpperCase() + type.slice(1)}
								</button>
							),
						)}
					</div>

					<div className="max-h-60 space-y-2 overflow-y-auto">
						{props.members.map((member) => {
							const isSelected = () => selectedUsers().includes(member._id);
							const isLastUser = () => member._id === lastSelectedUserId();

							return (
								<div
									key={member._id}
									className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 p-3"
								>
									<div className="flex items-center gap-3">
										<button
											className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border ${
												isSelected()
													? "border-sky-500 bg-sky-500 text-white"
													: "border-stone-200 bg-white"
											}`}
											type="button"
											onClick={() => toggleUser(member._id)}
										>
											{isSelected() ? <Check className="h-3 w-3" /> : null}
										</button>
										<span className="text-sm font-medium text-stone-900">
											{member.firstName} {member.lastName}
										</span>
									</div>

									{isSelected() ? (
										<div className="flex items-center gap-1 text-sm font-medium text-stone-900">
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
									) : null}
								</div>
							);
						})}
					</div>

					<div className="border-stone-100 border-t pt-4">
						{splitType() === "percentage" ? (
							<div className="mb-2 flex justify-between text-sm font-medium">
								<span className="text-stone-500">Total percentage:</span>
								<span
									className={
										Math.abs(totalPercent() - 100) < 0.01
											? "text-emerald-600"
											: "text-red-600"
									}
								>
									{totalPercent().toFixed(1)}%
								</span>
							</div>
						) : null}
						{splitType() === "shares" ? (
							<div className="mb-2 flex justify-between text-sm font-medium">
								<span className="text-stone-500">Total shares:</span>
								<span
									className={
										totalSharesDisplay() > 0
											? "text-emerald-600"
											: "text-red-600"
									}
								>
									{totalSharesDisplay()}
								</span>
							</div>
						) : null}
						<div className="mb-2 flex justify-between text-sm font-medium">
							<span className="text-stone-500">Total assigned:</span>
							<span
								className={
									Math.abs(totalAssigned() - props.amount) < 0.01
										? "text-emerald-600"
										: "text-red-600"
								}
							>
								{totalAssigned().toFixed(2)} / {props.amount.toFixed(2)}{" "}
								{props.currency}
							</span>
						</div>
						{validationError() ? (
							<div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2">
								<p className="text-red-600 text-sm">{validationError()}</p>
							</div>
						) : null}
						<div className="flex gap-3">
							<Button
								className="flex-1 border border-stone-200 bg-white text-stone-900 hover:border-sky-500 hover:bg-white hover:text-sky-500"
								onClick={props.onClose}
							>
								Cancel
							</Button>
							<Button
								className="flex-1 bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
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
	if (props.splitType === "exact") {
		if (props.isLastUser) {
			return (
				<span className="rounded-lg bg-sky-50 px-2 py-1 text-sky-500">
					{props.getExactAmountForUser(props.memberId).toFixed(2)}{" "}
					{props.currency}
				</span>
			);
		}

		return (
			<div className="flex items-center gap-1">
				<CurrencyInput
					className="w-20 rounded-lg border border-stone-200 bg-white px-2 py-1 text-right"
					placeholder="0.00"
					value={props.getExactAmountForUser(props.memberId)}
					onValueChange={(value) =>
						props.handleExactAmountChange(props.memberId, value)
					}
				/>
				<span className="text-stone-400 text-xs">{props.currency}</span>
			</div>
		);
	}

	if (props.splitType === "percentage") {
		if (props.isLastUser) {
			return (
				<span className="rounded-lg bg-sky-50 px-2 py-1 text-sky-500">
					{props.getPercentageForUser(props.memberId).toFixed(1)}%
				</span>
			);
		}

		return (
			<div className="flex items-center gap-1">
				<input
					className="w-16 rounded-lg border border-stone-200 bg-white px-2 py-1 text-right text-stone-900 outline-none focus:border-sky-500"
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
				<span className="text-stone-400 text-xs">%</span>
			</div>
		);
	}

	if (props.splitType === "shares") {
		return (
			<div className="flex items-center gap-2">
				<input
					className="w-14 rounded-lg border border-stone-200 bg-white px-2 py-1 text-right text-stone-900 outline-none focus:border-sky-500"
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
				<span className="text-stone-400 text-xs">
					= {props.getAmountFromShares(props.memberId).toFixed(2)}{" "}
					{props.currency}
				</span>
			</div>
		);
	}

	return (
		<span>
			{(props.amount / props.selectedUsersCount).toFixed(2)} {props.currency}
		</span>
	);
}

function EditExpensePage(props: {
	groupData: GroupData;
	searchParams: EditExpenseSearchParams;
	telegramChatId: number;
	telegramUserId: number;
}) {
	const navigate = useNavigate();
	const { mutate: addExpense } = useMutation({
		mutationFn: useConvexMutation(api.groups.addExpense),
	});
	const { mutate: updateExpense } = useMutation({
		mutationFn: useConvexMutation(api.groups.updateExpense),
	});
	const expenseId = props.searchParams.expenseId as Id<"expenses"> | null;
	const isEditing = () => expenseId !== null;
	const editItems = parseEditItems(props.searchParams.items);
	const editDescription = props.searchParams.description;
	const editCurrency =
		props.searchParams.currency || props.groupData.defaultCurrency || "USD";
	const editPayerId = props.searchParams.payerId as Id<"users"> | null;
	const submitButtonRef = useRef<HTMLButtonElement | null>(null);

	const defaultSplits = (amount: number): SplitShare[] =>
		props.groupData.members.map((member) => ({
			amount: amount / props.groupData.members.length || 0,
			userId: member._id,
		}));

	const [currency, setCurrency] = useAccessorState(editCurrency);
	const currencySymbol = () => currencySigns[currency()] || "$";
	const [payer, setPayer] = useAccessorState<Doc<"users"> | null>(
		editPayerId
			? (props.groupData.members.find((member) => member._id === editPayerId) ??
					null)
			: (props.groupData.members.find(
					(member) => member.telegramUserId === props.telegramUserId,
				) ?? null),
	);
	const [date, setDate] = useAccessorState(
		props.searchParams.date
			? new Date(Number(props.searchParams.date)).toISOString().split("T")[0]
			: new Date().toISOString().split("T")[0],
	);
	const [items, setItems] = useAccessorState<SubItem[]>(
		createInitialItems(editItems, editDescription),
	);
	const [activeSplitIndex, setActiveSplitIndex] = useAccessorState<
		number | null
	>(null);
	const [showSimpleSplitModal, setShowSimpleSplitModal] =
		useAccessorState(false);

	useEffect(() => {
		if (payer() !== null) return;
		const selectedPayer =
			editPayerId !== null
				? props.groupData.members.find((member) => member._id === editPayerId)
				: props.groupData.members.find(
						(member) => member.telegramUserId === props.telegramUserId,
					);
		setPayer(selectedPayer ?? null);
	}, [editPayerId, payer(), props.groupData.members, props.telegramUserId]);

	const firstItem = () => items()[0] ?? { amount: 0, name: "", splits: [] };
	const rest = () => items().slice(1);
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

	const formValidation = () => {
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
	};

	const isFormValid = () => formValidation().success;

	const handleSplitSave = (index: number, nextSplits: SplitShare[]) => {
		handleItemChange(index, "splits", nextSplits);
		setActiveSplitIndex(null);
	};

	const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
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

	const activeSplitItem = () => {
		const index = activeSplitIndex();
		return index === null ? null : (items()[index] ?? null);
	};

	return (
		<div className="min-h-screen bg-stone-50 pb-20 text-stone-900">
			<div className="mx-auto my-8 max-w-[430px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm max-[480px]:my-0 max-[480px]:min-h-screen max-[480px]:rounded-none max-[480px]:border-0">
				<div className="flex min-h-[4.375rem] items-center gap-4 border-stone-100 border-b px-5 py-3">
					<button
						className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100"
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
						<ArrowLeft className="h-4 w-4" />
					</button>
					<h1 className="font-heading text-stone-900 text-xl">
						{isEditing() ? "Edit Expense" : "Add Expense"}
					</h1>
				</div>

				<div className="p-5">
					<form className="space-y-4" onSubmit={handleSubmit}>
						<div className="rounded-lg border border-stone-200 bg-white p-4">
							<label
								className="mb-2 block font-semibold text-stone-500 text-sm"
								htmlFor="description"
							>
								Description
							</label>
							<input
								className="w-full rounded-lg border border-stone-200 bg-white px-3 py-3 text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 [&:user-invalid]:border-red-600"
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

						<div className="rounded-lg border border-stone-200 bg-white p-4">
							<label
								className="mb-2 block font-semibold text-stone-500 text-sm"
								htmlFor="date"
							>
								Date
							</label>
							<div className="relative">
								<input
									className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 py-3 text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 [&:user-invalid]:border-red-600"
									id="date"
									max={new Date().toISOString().split("T")[0]}
									name="date"
									required
									type="date"
									value={date()}
									onInput={(event) => setDate(event.currentTarget.value)}
								/>
								<Calendar className="pointer-events-none absolute top-1/2 right-4 h-5 w-5 -translate-y-1/2 transform text-stone-400" />
							</div>
						</div>

						<div className="rounded-lg border border-stone-200 bg-white p-4">
							<label
								className="mb-2 block font-semibold text-stone-500 text-sm"
								htmlFor="amount"
							>
								Amount
							</label>
							<div className="flex items-center justify-center rounded-lg bg-white pl-3 outline outline-1 -outline-offset-1 outline-stone-200 has-[:focus-within]:outline-sky-500 has-[input:user-invalid]:outline-red-600">
								<div className="shrink-0 select-none text-base text-stone-500 sm:text-sm/6">
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
									onValueChange={(value) =>
										handleItemChange(0, "amount", value)
									}
								/>
								<div className="grid shrink-0 grid-cols-1 border-stone-200 border-l focus-within:relative">
									<select
										aria-label="Currency"
										className="col-start-1 row-start-1 w-full appearance-none rounded-r-lg bg-transparent py-3 pr-7 pl-3 text-base text-stone-500 placeholder:text-stone-400 focus:outline-none sm:text-sm/6"
										id="currency"
										value={currency()}
										onChange={(event) => setCurrency(event.currentTarget.value)}
									>
										<CurrencyDropdownOptions />
									</select>
									<svg
										aria-hidden="true"
										className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-stone-400 sm:size-4"
										data-slot="icon"
										fill="currentColor"
										viewBox="0 0 16 16"
									>
										<path
											clipRule="evenodd"
											d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
											fillRule="evenodd"
										/>
									</svg>
								</div>
							</div>
						</div>

						{payer() ? (
							<div className="rounded-lg border border-stone-200 bg-white p-4">
								<label
									className="mb-2 block font-semibold text-stone-500 text-sm"
									htmlFor="payer"
								>
									Paid by
								</label>
								<select
									className="w-full appearance-none rounded-lg border border-stone-200 bg-white px-3 py-3 text-stone-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 [&:user-invalid]:border-red-600"
									id="payer"
									value={payer()!._id}
									onChange={(event) => {
										const member = props.groupData.members.find(
											(groupMember) =>
												groupMember._id === event.currentTarget.value,
										);
										if (member) setPayer(member);
									}}
								>
									{props.groupData.members.map((member) => (
										<option key={member._id} value={member._id}>
											{member.firstName} {member.lastName}
										</option>
									))}
								</select>
							</div>
						) : null}

						{!isItemized() ? (
							<div className="flex-1">
								<button
									className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-sky-50 px-4 py-3 font-semibold text-sky-500 text-sm transition hover:border-sky-500"
									type="button"
									onClick={() => setShowSimpleSplitModal(true)}
								>
									<Split className="h-5 w-5" />
									{splits().length > 0
										? `Split among ${splits().length} people`
										: "Split Expense"}
								</button>
							</div>
						) : null}

						<div className="space-y-3 pt-1">
							<div className="flex items-center justify-between">
								<div className="block font-semibold text-stone-500 text-sm">
									{isItemized() ? "Items & Splits" : null}
								</div>
								{!isItemized() ? (
									<button
										className="flex items-center gap-1 font-semibold text-sky-500 text-sm hover:text-sky-600"
										type="button"
										onClick={handleAddItem}
									>
										<Plus className="h-4 w-4" /> Itemize Expense
									</button>
								) : (
									<button
										className="flex items-center gap-1 font-semibold text-red-600 text-sm hover:text-red-700"
										type="button"
										onClick={handleClearItems}
									>
										<Trash2 className="h-4 w-4" /> Delete All
									</button>
								)}
							</div>

							{isItemized() ? (
								<>
									{rest().map((item, itemIndex) => (
										<div
											key={`${item.name}:${itemIndex}`}
											className="space-y-3 rounded-lg border border-stone-200 bg-white p-4"
										>
											<div className="flex items-start gap-3">
												<div className="flex-1 space-y-3">
													<input
														className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-900 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 [&:user-invalid]:border-red-600"
														placeholder="Item name"
														required
														type="text"
														value={item.name}
														onInput={(event) =>
															handleItemChange(
																itemIndex + 1,
																"name",
																event.currentTarget.value,
															)
														}
													/>
												</div>
												<button
													className="rounded-lg border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50"
													type="button"
													onClick={() => handleRemoveItem(itemIndex + 1)}
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</div>
											<div className="flex items-start gap-3">
												<div className="flex w-auto items-center justify-center rounded-lg bg-white pl-3 outline outline-1 -outline-offset-1 outline-stone-200 has-[:focus-within]:outline-sky-500 has-[input:user-invalid]:outline-red-600">
													<div className="shrink-0 select-none text-center text-stone-500 sm:text-sm/6">
														{currencySymbol()}
													</div>
													<CurrencyInput
														className="w-1/2 rounded-lg bg-white py-2 pr-3 pl-1 text-stone-900 text-sm"
														placeholder="0.00"
														required
														value={item.amount}
														onValueChange={(value) =>
															handleItemChange(itemIndex + 1, "amount", value)
														}
													/>
												</div>
												<button
													className="flex flex-3 items-center justify-center gap-1 rounded-lg bg-sky-50 px-3 py-2 font-semibold text-sky-500 text-sm transition hover:bg-sky-100"
													type="button"
													onClick={() => setActiveSplitIndex(itemIndex + 1)}
												>
													<Split className="h-4 w-4" />
													{item.splits.length > 0
														? `${item.splits.length} people`
														: "Split"}
												</button>
											</div>
										</div>
									))}

									<button
										className="flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 border-dashed py-3 font-semibold text-sky-500 text-sm transition hover:bg-sky-50"
										type="button"
										onClick={handleAddItem}
									>
										<Plus className="h-5 w-5" /> Add Another Item
									</button>
								</>
							) : null}
						</div>

						<button
							className="hidden w-full items-center justify-center gap-2 rounded-lg border border-stone-200 border-dashed py-3 font-semibold text-sky-500 text-sm transition hover:bg-sky-50"
							ref={submitButtonRef}
							type="submit"
						>
							Submit
						</button>

						<TelegramMainButton
							ready={isFormValid()}
							show={isFormValid()}
							text={isEditing() ? "Update Expense" : "Save Expense"}
							onClick={() => submitButtonRef.current?.click()}
						/>
					</form>
				</div>
			</div>

			{activeSplitItem()
				? (() => {
						const currentItem = activeSplitItem()!;
						const index = activeSplitIndex();
						return (
							<SplitModal
								amount={currentItem.amount}
								currency={currency()}
								initialSplits={currentItem.splits}
								itemName={currentItem.name || "Item"}
								members={props.groupData.members}
								onClose={() => setActiveSplitIndex(null)}
								onSave={(nextSplits) => {
									if (index !== null) {
										handleSplitSave(index, nextSplits);
									}
								}}
							/>
						);
					})()
				: null}

			{showSimpleSplitModal() ? (
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
			) : null}
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
