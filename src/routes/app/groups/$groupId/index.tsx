import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import type { FunctionReturnType } from "convex/server";
import {
	ArrowLeftRight,
	ArrowRight,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	Loader2,
	Plus,
	Receipt,
	Settings,
	TrendingDown,
	TrendingUp,
	Users,
	Wallet,
} from "lucide-solid";
import { createMemo, createSignal, For, Show } from "solid-js";

import { TelegramMainButton } from "#/components/telegram-main-button";
import { useMutation, useQuery } from "#/solid-convex";
import { useTelegramLaunch } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const Route = createFileRoute("/app/groups/$groupId/")({
	component: GroupIndexRoute,
});

type GroupData = NonNullable<
	FunctionReturnType<typeof api.groups.getListOfExpenses>
>;
type Expense = GroupData["expenses"][number];

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

function GroupIndexRoute() {
	const params = Route.useParams();
	const { groupId } = params();
	const telegramChatId = Number(groupId);
	const { telegramUserId } = useTelegramLaunch();

	if (Number.isNaN(telegramChatId)) {
		return (
			<div class="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
				<Empty text="Invalid Telegram group id." />
			</div>
		);
	}

	return (
		<Show when={telegramUserId()} fallback={<Loading />}>
			{(currentTelegramUserId) => (
				<GroupIndexData
					telegramChatId={telegramChatId}
					telegramUserId={currentTelegramUserId()}
				/>
			)}
		</Show>
	);
}

function GroupIndexData(props: {
	telegramChatId: number;
	telegramUserId: number;
}) {
	const groupData = useQuery(api.groups.getListOfExpenses, {
		telegramChatId: props.telegramChatId,
	});
	const isRegisteredMemberOfGroup = useQuery(api.groups.isUserMemberOfGroup, {
		telegramChatId: props.telegramChatId,
		telegramUserId: props.telegramUserId,
	});

	return (
		<Show
			when={
				groupData() !== undefined && isRegisteredMemberOfGroup() !== undefined
			}
			fallback={<Loading />}
		>
			<Show when={groupData()} fallback={<Empty text="Group not found." />}>
				{(data) => (
					<GroupView
						groupData={data()}
						groupIdNumber={props.telegramChatId}
						isRegisteredMemberOfGroup={isRegisteredMemberOfGroup() === true}
						telegramUserId={props.telegramUserId}
					/>
				)}
			</Show>
		</Show>
	);
}

function GroupView(props: {
	groupData: GroupData;
	groupIdNumber: number;
	isRegisteredMemberOfGroup: boolean;
	telegramUserId: number;
}) {
	const navigate = useNavigate();
	const [membersCollapsed, setMembersCollapsed] = createSignal(true);
	const addUserToGroup = useMutation(api.groups.addUserToGroup);
	const currentUserId = createMemo(
		() =>
			props.groupData.members.find(
				(member) => member.telegramUserId === props.telegramUserId,
			)?._id,
	);

	const currencyBalances = createMemo<CurrencyBalances>(() => {
		const current = currentUserId();
		if (!current) return {};

		const balances: CurrencyBalances = {};

		const getOrCreateCurrency = (currency: string): CurrencyData => {
			if (!(currency in balances)) {
				balances[currency] = { netBalance: 0, memberBalances: {} };
			}
			return balances[currency];
		};

		const getOrCreateMemberBalance = (
			currencyData: CurrencyData,
			memberId: Id<"users">,
		): MemberBalance => {
			if (!(memberId in currencyData.memberBalances)) {
				const member = props.groupData.members.find((m) => m._id === memberId);
				currencyData.memberBalances[memberId] = {
					memberId,
					memberName: member?.firstName || member?.username || "Unknown",
					balance: 0,
				};
			}
			return currencyData.memberBalances[memberId];
		};

		for (const expense of props.groupData.expenses) {
			const currencyData = getOrCreateCurrency(expense.currency);
			const isCurrentUserPayer = expense.payerId === current;

			for (const item of expense.items) {
				for (const split of item.splits) {
					if (isCurrentUserPayer) {
						if (split.userId !== current) {
							currencyData.netBalance += split.amount;
							getOrCreateMemberBalance(currencyData, split.userId).balance +=
								split.amount;
						}
					} else if (split.userId === current) {
						currencyData.netBalance -= split.amount;
						getOrCreateMemberBalance(currencyData, expense.payerId).balance -=
							split.amount;
					}
				}
			}
		}

		return balances;
	});

	const calculateUserBalance = (expense: Expense) => {
		const current = currentUserId();
		if (!current) return 0;

		const totalAmount = expense.items.reduce(
			(sum, item) => sum + item.amount,
			0,
		);
		let userOwes = 0;

		for (const item of expense.items) {
			for (const split of item.splits) {
				if (split.userId === current) {
					userOwes += split.amount;
				}
			}
		}

		return expense.payerId === current ? totalAmount - userOwes : -userOwes;
	};

	const handleEditExpense = (expense: Expense) => {
		void navigate({
			params: {
				groupId: String(props.groupIdNumber),
			},
			search: {
				currency: expense.currency,
				date: String(expense.date),
				description: expense.description,
				expenseId: expense._id,
				items: JSON.stringify(expense.items),
				payerId: expense.payerId,
			},
			to: "/app/groups/$groupId/add-expense",
		});
	};

	const handleJoinGroup = async () => {
		try {
			await addUserToGroup({
				telegramChatId: props.groupIdNumber,
				telegramUserId: props.telegramUserId,
			});
		} catch (error) {
			console.error("Failed to join group:", error);
			alert("Failed to join group. Please try again.");
		}
	};

	return (
		<div class="relative min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20 dark:from-gray-900 dark:to-gray-800">
			<Show when={!props.isRegisteredMemberOfGroup}>
				<div class="absolute inset-0 z-40 bg-black/50" />
			</Show>

			<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 pb-12 text-white dark:from-blue-600 dark:to-cyan-600">
				<h1 class="mb-4 text-3xl font-bold">{props.groupData.title}</h1>
			</div>

			<div class="-mt-12 space-y-6 px-4">
				<section class="rounded-2xl bg-white p-5 shadow-lg dark:bg-gray-800">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
							Your Balance
						</h2>
						<Link
							class="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
							params={{
								groupId: String(props.groupIdNumber),
							}}
							to="/app/groups/$groupId/settings"
						>
							<Settings class="h-5 w-5 text-gray-500 dark:text-gray-400" />
						</Link>
					</div>

					<Show
						when={Object.keys(currencyBalances()).length > 0}
						fallback={
							<div class="py-4 text-center text-gray-500 dark:text-gray-400">
								<p>No expenses yet</p>
							</div>
						}
					>
						<div class="space-y-3">
							<For each={Object.entries(currencyBalances())}>
								{([currency, currencyData]) => (
									<CurrencyBalanceCard
										currency={currency}
										currencyData={currencyData}
									/>
								)}
							</For>
						</div>
					</Show>
				</section>

				<Show when={props.isRegisteredMemberOfGroup && currentUserId()}>
					{(userId) => (
						<SettleUp
							currencyBalances={currencyBalances()}
							currentUserId={userId()}
							groupIdNumber={props.groupIdNumber}
							telegramUserId={props.telegramUserId}
						/>
					)}
				</Show>

				<section>
					<button
						class="mb-3 flex w-full items-center gap-2 px-1"
						type="button"
						onClick={() => setMembersCollapsed(!membersCollapsed())}
					>
						<Users class="h-5 w-5 text-gray-500" />
						<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
							Members ({props.groupData.memberCount})
						</h2>
						<Show
							when={membersCollapsed()}
							fallback={<ChevronUp class="ml-auto h-5 w-5 text-gray-500" />}
						>
							<ChevronDown class="ml-auto h-5 w-5 text-gray-500" />
						</Show>
					</button>
					<Show when={!membersCollapsed()}>
						<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
							<div class="flex flex-wrap gap-2">
								<For each={props.groupData.members}>
									{(member) => (
										<div class="flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-700/50">
											<div class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
												{(
													member.firstName?.[0] ||
													member.username?.[0] ||
													"?"
												).toUpperCase()}
											</div>
											<span class="text-sm font-medium text-gray-700 dark:text-gray-200">
												{member.firstName} {member.lastName}
											</span>
										</div>
									)}
								</For>
							</div>
						</div>
					</Show>
				</section>

				<section>
					<div class="mb-3 flex items-center gap-2 px-1">
						<Receipt class="h-5 w-5 text-gray-500" />
						<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
							Expenses
						</h2>
					</div>

					<div class="space-y-3">
						<Show
							when={props.groupData.expenses.length > 0}
							fallback={
								<div class="rounded-2xl bg-white py-8 text-center text-gray-500 dark:bg-gray-800 dark:text-gray-400">
									<p>No expenses yet</p>
								</div>
							}
						>
							<For each={props.groupData.expenses}>
								{(expense) => (
									<ExpenseRow
										expense={expense}
										onEdit={() => handleEditExpense(expense)}
										telegramUserId={props.telegramUserId}
										userBalance={calculateUserBalance(expense)}
									/>
								)}
							</For>
						</Show>
					</div>
				</section>
			</div>

			<Show
				when={props.isRegisteredMemberOfGroup}
				fallback={
					<TelegramMainButton
						once
						text="Join Group"
						onClick={handleJoinGroup}
					/>
				}
			>
				<AddExpenseButton
					telegramChatId={props.groupIdNumber}
					telegramUserId={props.telegramUserId}
				/>
			</Show>
		</div>
	);
}

function CurrencyBalanceCard(props: {
	currency: string;
	currencyData: CurrencyData;
}) {
	const isPositive = () => props.currencyData.netBalance >= 0;
	const memberBalanceEntries = () =>
		Object.values(props.currencyData.memberBalances).filter(
			(member) => member.balance !== 0,
		);

	return (
		<div
			class={`rounded-xl border p-4 ${
				isPositive()
					? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
					: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
			}`}
		>
			<div class="mb-3 flex items-center justify-between">
				<div>
					<span
						class={`mb-1 block text-sm font-medium ${
							isPositive()
								? "text-green-700 dark:text-green-300"
								: "text-red-700 dark:text-red-300"
						}`}
					>
						{props.currency}
					</span>
					<p
						class={`text-2xl font-bold ${
							isPositive()
								? "text-green-600 dark:text-green-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						{isPositive() ? "+" : ""}
						{formatCurrencyAmount(
							props.currencyData.netBalance,
							props.currency,
						)}
					</p>
				</div>
				<div
					class={`rounded-full p-3 ${
						isPositive()
							? "bg-green-100 text-green-600 dark:bg-green-800/30"
							: "bg-red-100 text-red-600 dark:bg-red-800/30"
					}`}
				>
					<Show when={isPositive()} fallback={<TrendingDown class="h-6 w-6" />}>
						<TrendingUp class="h-6 w-6" />
					</Show>
				</div>
			</div>

			<Show when={memberBalanceEntries().length > 0}>
				<div class="mt-2 space-y-2 border-gray-200 border-t pt-3 dark:border-gray-700">
					<For each={memberBalanceEntries()}>
						{(member) => {
							const isMemberPositive = member.balance > 0;
							return (
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<div class="flex h-6 w-6 items-center justify-center rounded-full bg-white/50 text-xs font-bold text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
											{member.memberName[0]?.toUpperCase() || "?"}
										</div>
										<span class="text-sm text-gray-700 dark:text-gray-200">
											{member.memberName}
										</span>
										<div class="flex items-center gap-1 text-xs">
											<span class="text-gray-500 dark:text-gray-400">
												{isMemberPositive ? "owes you" : "you owe"}
											</span>
											<ArrowRight
												class={`h-3 w-3 ${
													isMemberPositive ? "text-green-500" : "text-red-500"
												}`}
											/>
										</div>
									</div>
									<span
										class={`text-sm font-semibold ${
											isMemberPositive
												? "text-green-600 dark:text-green-400"
												: "text-red-600 dark:text-red-400"
										}`}
									>
										{formatCurrencyAmount(
											Math.abs(member.balance),
											props.currency,
										)}
									</span>
								</div>
							);
						}}
					</For>
				</div>
			</Show>
		</div>
	);
}

function ExpenseRow(props: {
	expense: Expense;
	onEdit: () => void;
	telegramUserId: number;
	userBalance: number;
}) {
	const isMe = () => props.expense.payerTelegramUserId === props.telegramUserId;
	const isInvolved = () => props.userBalance !== 0;
	const totalAmount = () =>
		props.expense.items.reduce((sum, item) => sum + item.amount, 0);
	const isTransfer = () => props.expense.type === "transfer";
	const styles = () => {
		if (!isInvolved()) {
			return {
				amountPrefix: "",
				amountText: "text-gray-500 dark:text-gray-400",
				cardOpacity: "opacity-60",
				iconBg:
					"bg-gray-100 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500",
			};
		}

		if (isTransfer()) {
			return {
				amountPrefix: "",
				amountText: "text-purple-600 dark:text-purple-400",
				cardOpacity: "",
				iconBg:
					"bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
			};
		}

		if (props.userBalance > 0) {
			return {
				amountPrefix: "+",
				amountText: "text-green-600 dark:text-green-400",
				cardOpacity: "",
				iconBg:
					"bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
			};
		}

		return {
			amountPrefix: "-",
			amountText: "text-red-600 dark:text-red-400",
			cardOpacity: "",
			iconBg: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
		};
	};

	return (
		<button
			class={`flex w-full cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50 ${styles().cardOpacity}`}
			type="button"
			onClick={props.onEdit}
		>
			<div class="flex items-center gap-3">
				<div
					class={`flex h-10 w-10 items-center justify-center rounded-full ${styles().iconBg}`}
				>
					<Show when={isTransfer()} fallback={<Wallet class="h-5 w-5" />}>
						<ArrowLeftRight class="h-5 w-5" />
					</Show>
				</div>
				<div class="text-left">
					<p class="font-medium text-gray-900 dark:text-white">
						{props.expense.description}
					</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						{isTransfer()
							? `Settled with ${props.expense.payerName}`
							: `${isMe() ? "You" : props.expense.payerName} paid • ${formatDate(props.expense.date)}`}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<div class="text-right">
					<span class={`font-bold ${styles().amountText}`}>
						{styles().amountPrefix}
						{formatCurrencyAmount(
							isInvolved() || isTransfer()
								? Math.abs(props.userBalance)
								: totalAmount(),
							props.expense.currency,
						)}
					</span>
					<Show when={!isTransfer() && isInvolved()}>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							{formatCurrencyAmount(totalAmount(), props.expense.currency)}
						</p>
					</Show>
				</div>
				<ChevronRight class="h-4 w-4 text-gray-400" />
			</div>
		</button>
	);
}

function SettleUp(props: {
	currencyBalances: CurrencyBalances;
	currentUserId: Id<"users">;
	groupIdNumber: number;
	telegramUserId: number;
}) {
	const settleUp = useMutation(api.groups.settleUp);
	const [settleDialog, setSettleDialog] = createSignal<{
		memberId: Id<"users">;
		memberName: string;
		amount: number;
		currency: string;
	} | null>(null);

	const balanceEntries = () =>
		Object.entries(props.currencyBalances).flatMap(([currency, currencyData]) =>
			Object.entries(currencyData.memberBalances)
				.filter(([, member]) => member.balance !== 0)
				.map(([memberId, member]) => ({
					currency,
					member: { ...member, memberId: memberId as Id<"users"> },
				})),
		);

	const handleSettle = async () => {
		const dialog = settleDialog();
		if (!dialog) return;

		try {
			const payerId = dialog.amount > 0 ? dialog.memberId : props.currentUserId;
			const receiverId =
				dialog.amount > 0 ? props.currentUserId : dialog.memberId;

			await settleUp({
				amount: Math.abs(dialog.amount),
				currency: dialog.currency,
				payerId,
				receiverId,
				telegramChatId: props.groupIdNumber,
				telegramUserId: props.telegramUserId,
			});
			setSettleDialog(null);
		} catch (error) {
			console.error("Failed to settle:", error);
			alert("Failed to settle. Please try again.");
		}
	};

	return (
		<section>
			<div class="mb-3 flex items-center gap-2 px-1">
				<ArrowLeftRight class="h-5 w-5 text-gray-500" />
				<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
					Settle Up
				</h2>
			</div>
			<div class="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
				<Show
					when={balanceEntries().length > 0}
					fallback={
						<p class="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
							All settled up!
						</p>
					}
				>
					<div class="-mb-2 flex flex-wrap gap-2 overflow-x-auto pb-2">
						<For each={balanceEntries()}>
							{({ currency, member }) => (
								<button
									class={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
										member.balance > 0
											? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/40"
											: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40"
									}`}
									type="button"
									onClick={() =>
										setSettleDialog({
											amount: member.balance,
											currency,
											memberId: member.memberId,
											memberName: member.memberName,
										})
									}
								>
									<span>
										{member.balance > 0 ? "Collect from" : "Pay"}{" "}
										{member.memberName}
									</span>
									<span class="font-bold">
										{formatCurrencyAmount(Math.abs(member.balance), currency)}
									</span>
								</button>
							)}
						</For>
					</div>
				</Show>
			</div>

			<Show when={settleDialog()}>
				{(dialog) => (
					<div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
						<div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
							<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
								Confirm Settlement
							</h3>
							<p class="mb-6 text-gray-600 dark:text-gray-300">
								{dialog().amount > 0
									? `Collect ${formatCurrencyAmount(
											dialog().amount,
											dialog().currency,
										)} from ${dialog().memberName}?`
									: `Pay ${formatCurrencyAmount(
											Math.abs(dialog().amount),
											dialog().currency,
										)} to ${dialog().memberName}?`}
							</p>
							<div class="flex gap-3">
								<button
									class="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
									type="button"
									onClick={() => setSettleDialog(null)}
								>
									Cancel
								</button>
								<button
									class="flex-1 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600"
									type="button"
									onClick={handleSettle}
								>
									Confirm
								</button>
							</div>
						</div>
					</div>
				)}
			</Show>
		</section>
	);
}

function AddExpenseButton(props: {
	telegramChatId: number;
	telegramUserId: number;
}) {
	return (
		<Link
			aria-label="Add expense"
			class="fixed right-6 bottom-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-blue-600 focus:scale-95 focus:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 active:scale-95"
			params={{
				groupId: String(props.telegramChatId),
			}}
			search={{
				currency: null,
				date: null,
				description: "",
				expenseId: null,
				items: null,
				payerId: null,
			}}
			to="/app/groups/$groupId/add-expense"
		>
			<Plus class="h-6 w-6" />
		</Link>
	);
}

function Loading() {
	return (
		<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
			<Loader2 class="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
		</div>
	);
}

function Empty(props: { text: string }) {
	return (
		<p class="rounded-2xl bg-white p-6 text-center text-gray-600 shadow-lg dark:bg-gray-800 dark:text-gray-300">
			{props.text}
		</p>
	);
}

function formatDate(timestamp: number) {
	return new Intl.DateTimeFormat("en-US", {
		day: "numeric",
		month: "short",
	}).format(new Date(timestamp));
}

function formatCurrencyAmount(amount: number, currency: string) {
	return new Intl.NumberFormat("en-US", { currency, style: "currency" }).format(
		amount,
	);
}
