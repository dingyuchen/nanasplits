import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import {
	ArrowLeftRight,
	ArrowRight,
	LoaderCircle,
	Plus,
	Receipt,
	Settings,
	Users,
} from "lucide-react";
import { useState } from "react";

import { TelegramMainButton } from "#/components/telegram-main-button";
import NotFound from "#/components/ui/not-found";
import { useQuery } from "#/convex-react";
import { getCurrencyConversion } from "#/currency-conversion";
import {
	buildSettleUpConversionOptions,
	filteredCurrencyCodes,
	type SettleUpConversionOption,
} from "#/lib/expense-conversion";
import { useTelegramLaunchParams } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export const Route = createFileRoute("/app/groups/$groupId/")({
	loader: ({ context, params }) => {
		const telegramChatId = Number(params.groupId);
		if (!Number.isNaN(telegramChatId)) {
			void context.queryClient.prefetchQuery(
				convexQuery(api.groups.getListOfExpenses, { telegramChatId }),
			);
		}
	},
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
type ConversionQuote = Awaited<ReturnType<typeof getCurrencyConversion>>;

function GroupIndexRoute() {
	const params = Route.useParams();
	const { groupId } = params;
	const telegramChatId = Number(groupId);
	const { telegramUserId } = useTelegramLaunchParams();
	const currentTelegramUserId = telegramUserId();

	if (Number.isNaN(telegramChatId)) {
		return <NotFound text="Invalid Telegram group id." title="Invalid group" />;
	}

	if (currentTelegramUserId === null) {
		return <Loading />;
	}

	return (
		<GroupIndexData
			telegramChatId={telegramChatId}
			telegramUserId={currentTelegramUserId}
		/>
	);
}

function GroupIndexData(props: {
	telegramChatId: number;
	telegramUserId: number;
}) {
	const { data, isPending, error } = useQuery(api.groups.getListOfExpenses, {
		telegramChatId: props.telegramChatId,
	});
	const {
		data: isRegistered,
		isPending: isRegisteredPending,
		error: isRegisteredError,
	} = useQuery(api.groups.isUserMemberOfGroup, {
		telegramChatId: props.telegramChatId,
		telegramUserId: props.telegramUserId,
	});

	if (isPending || isRegisteredPending) {
		return <Loading />;
	}

	if (!data) {
		return (
			<NotFound
				text="This group is not available in NanaSplits."
				title="Group not found"
			/>
		);
	}

	if (error !== null || isRegisteredError !== null) {
		<NotFound text="Something went wrong" title="Error getting group data" />;
	}

	return (
		<GroupView
			groupData={data}
			groupIdNumber={props.telegramChatId}
			isRegisteredMemberOfGroup={isRegistered === true}
			telegramUserId={props.telegramUserId}
		/>
	);
}

function GroupView(props: {
	groupData: GroupData;
	groupIdNumber: number;
	isRegisteredMemberOfGroup: boolean;
	telegramUserId: number;
}) {
	const navigate = useNavigate();
	const { mutate: addUserToGroup } = useMutation({
		mutationFn: useConvexMutation(api.groups.addUserToGroup),
	});
	const currentUserId = () =>
		props.groupData.members.find(
			(member) => member.telegramUserId === props.telegramUserId,
		)?._id;

	const currencyBalances: CurrencyBalances = (() => {
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
	})();

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

	const conversionOptions = () => {
		const current = currentUserId();
		if (!current) return [];

		return buildSettleUpConversionOptions({
			currencyBalances,
			currentUserId: current,
		});
	};
	const hasBalanceEntries = Object.values(currencyBalances).some(
		(currencyData) => currencyData.netBalance !== 0,
	);

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
				tag: expense.tag ?? null,
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
		<div className="relative min-h-screen bg-stone-50 pb-20 text-stone-900">
			{!props.isRegisteredMemberOfGroup ? (
				<div className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-[2px]" />
			) : null}

			<div className="relative mx-auto my-8 max-w-[430px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm max-[480px]:my-0 max-[480px]:min-h-screen max-[480px]:rounded-none max-[480px]:border-0">
				<header className="relative flex min-h-[4.375rem] items-center gap-3 border-stone-100 border-b px-5 py-3">
					<Link
						className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100"
						to="/app"
					>
						<ArrowRight className="h-4 w-4 rotate-180" />
					</Link>
					<div className="absolute left-1/2 w-[min(12rem,calc(100%-13rem))] -translate-x-1/2 text-center">
						<h1 className="font-serif font-medium tracking-tight truncate text-stone-900 text-[1.375rem] leading-tight">
							{props.groupData.title}
						</h1>
						<div className="mt-1 flex items-center justify-center gap-1 text-stone-400 text-xs">
							<Users className="h-3.5 w-3.5" />
							<span>{props.groupData.memberCount} members</span>
						</div>
					</div>
					<div className="relative z-10 ml-auto flex items-center gap-2">
						<Link
							className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100"
							params={{
								groupId: String(props.groupIdNumber),
							}}
							to="/app/groups/$groupId/settings"
						>
							<Settings className="h-4 w-4" />
						</Link>
						<div className="flex items-center justify-end">
							{props.groupData.members.slice(0, 3).map((member, index) => (
								<div
									key={member._id}
									className={`-ml-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white font-bold text-white text-xs first:ml-0 ${getAvatarColorClass(index)}`}
									title={getMemberDisplayName(member)}
								>
									{getMemberInitial(member)}
								</div>
							))}
						</div>
					</div>
				</header>

				<section className="mx-5 mt-5 space-y-3">
					{hasBalanceEntries ? (
						<BalanceCard currencyBalances={currencyBalances} />
					) : props.groupData.expenses.length === 0 ? (
						<EmptyExpenseState text="No expenses yet" />
					) : null}
				</section>

				{props.isRegisteredMemberOfGroup && currentUserId() ? (
					<SettleUp
						currencyBalances={currencyBalances}
						currentUserId={currentUserId() as Id<"users">}
						defaultCurrency={props.groupData.defaultCurrency}
						groupIdNumber={props.groupIdNumber}
						telegramUserId={props.telegramUserId}
					/>
				) : null}

				<section className="mx-5 mt-5 mb-5">
					<div className="mb-3 flex items-center justify-between gap-2 border-stone-100 border-b pb-2">
						<div className="flex items-center gap-2">
							<Receipt className="h-4 w-4 text-stone-400" />
							<h2 className="font-serif font-medium tracking-tight text-stone-900 text-lg">
								Expenses
							</h2>
							<span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-400 text-[0.6875rem]">
								{props.groupData.expenses.length}
							</span>
						</div>
						{props.isRegisteredMemberOfGroup &&
						conversionOptions().length > 0 ? (
							<ExpenseCurrencyConversionButton
								defaultCurrency={props.groupData.defaultCurrency}
								groupIdNumber={props.groupIdNumber}
								options={conversionOptions()}
								telegramUserId={props.telegramUserId}
							/>
						) : null}
					</div>

					<div>
						{props.groupData.expenses.length > 0 ? (
							props.groupData.expenses.map((expense) => (
								<ExpenseRow
									key={expense._id}
									expense={expense}
									onEdit={() => handleEditExpense(expense)}
									telegramUserId={props.telegramUserId}
									userBalance={calculateUserBalance(expense)}
								/>
							))
						) : (
							<EmptyExpenseState text="No expenses yet" />
						)}
					</div>
				</section>
			</div>

			{props.isRegisteredMemberOfGroup ? (
				<AddExpenseButton
					telegramChatId={props.groupIdNumber}
					telegramUserId={props.telegramUserId}
				/>
			) : (
				<TelegramMainButton once text="Join Group" onClick={handleJoinGroup} />
			)}
		</div>
	);
}

function BalanceCard(props: { currencyBalances: CurrencyBalances }) {
	const balanceEntries = () =>
		Object.entries(props.currencyBalances).filter(
			([, currencyData]) => currencyData.netBalance !== 0,
		);

	return (
		<div className="rounded-lg border border-stone-200 bg-white">
			<h2 className="px-4 pt-3 pb-2 text-left font-semibold text-stone-500 text-xs leading-tight">
				Your Balance
			</h2>
			<div>
				{balanceEntries().map(([currency, currencyData], index) => {
					const isPositive = currencyData.netBalance > 0;
					const isNegative = currencyData.netBalance < 0;
					return (
						<div
							key={currency}
							className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-3 ${
								index > 0 ? "border-stone-100 border-t" : ""
							}`}
						>
							<span className="truncate font-semibold text-stone-900 text-sm">
								{currency}
							</span>
							<span
								className={`whitespace-nowrap text-right font-bold text-sm tabular-nums ${
									isPositive
										? "text-emerald-600"
										: isNegative
											? "text-red-600"
											: "text-stone-500"
								}`}
							>
								{isPositive ? "+" : ""}
								{formatCurrencyAmount(currencyData.netBalance, currency)}
							</span>
						</div>
					);
				})}
			</div>
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
				amountText: "text-stone-400",
				rowOpacity: "opacity-60",
				dotBg: "bg-stone-400",
			};
		}

		if (isTransfer()) {
			return {
				amountPrefix: "",
				amountText: "text-sky-500",
				rowOpacity: "",
				dotBg: "bg-sky-500",
			};
		}

		if (props.userBalance > 0) {
			return {
				amountPrefix: "+",
				amountText: "text-emerald-600",
				rowOpacity: "",
				dotBg: "bg-emerald-600",
			};
		}

		return {
			amountPrefix: "-",
			amountText: "text-red-600",
			rowOpacity: "",
			dotBg: "bg-red-600",
		};
	};

	return (
		<button
			className={`flex w-full cursor-pointer items-center gap-3 border-stone-100 border-b px-2 py-3 text-left transition hover:-mx-2 hover:rounded-md hover:bg-stone-50 hover:px-4 ${styles().rowOpacity}`}
			type="button"
			onClick={props.onEdit}
		>
			<span className={`h-2 w-2 shrink-0 rounded-full ${styles().dotBg}`} />
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-stone-900 text-[0.9375rem]">
					{props.expense.description}
				</p>
				{props.expense.tag ? (
					<p className="truncate font-semibold text-sky-500 text-xs">
						#{props.expense.tag}
					</p>
				) : null}
				<p className="truncate text-stone-400 text-xs">
					{isTransfer()
						? `Settled with ${props.expense.payerName}`
						: `${isMe() ? "You" : props.expense.payerName} paid - ${formatDate(props.expense.date)}`}
				</p>
			</div>
			<div className="shrink-0 text-right">
				<span className={`font-semibold text-sm ${styles().amountText}`}>
					{styles().amountPrefix}
					{formatCurrencyAmount(
						isInvolved() || isTransfer()
							? Math.abs(props.userBalance)
							: totalAmount(),
						props.expense.currency,
					)}
				</span>
				{!isTransfer() && isInvolved() ? (
					<p className="text-stone-400 text-xs">
						{formatCurrencyAmount(totalAmount(), props.expense.currency)}
					</p>
				) : null}
			</div>
		</button>
	);
}

function SettleUp(props: {
	currencyBalances: CurrencyBalances;
	currentUserId: Id<"users">;
	defaultCurrency: string;
	groupIdNumber: number;
	telegramUserId: number;
}) {
	const { mutate: settleUp } = useMutation({
		mutationFn: useConvexMutation(api.groups.settleUp),
	});
	const [settleDialog, setSettleDialog] = useState<{
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

	const getSettlementParticipants = (dialog: {
		amount: number;
		memberId: Id<"users">;
	}) => ({
		payerId: dialog.amount > 0 ? dialog.memberId : props.currentUserId,
		receiverId: dialog.amount > 0 ? props.currentUserId : dialog.memberId,
	});

	const closeDialog = () => {
		setSettleDialog(null);
	};

	const handleSettle = async () => {
		const dialog = settleDialog;
		if (!dialog) return;

		try {
			const { payerId, receiverId } = getSettlementParticipants(dialog);

			await settleUp({
				amount: Math.abs(dialog.amount),
				currency: dialog.currency,
				payerId,
				receiverId,
				telegramChatId: props.groupIdNumber,
				telegramUserId: props.telegramUserId,
			});
			closeDialog();
		} catch (error) {
			console.error("Failed to settle:", error);
			alert("Failed to settle. Please try again.");
		}
	};

	return (
		<section className="mx-5 mt-5">
			<div className="border-stone-100 border-b pb-2">
				<h2 className="font-serif font-medium tracking-tight text-stone-900 text-lg">
					Settle Up
				</h2>
			</div>
			<div>
				{balanceEntries().length > 0 ? (
					<div>
						{balanceEntries().map(({ currency, member }, index) => {
							const isCollecting = member.balance > 0;
							return (
								<button
									key={`${currency}:${member.memberId}`}
									className="grid min-h-16 w-full grid-cols-[2.5rem_1.25rem_2.5rem_minmax(0,1fr)_auto] items-center gap-2.5 border-stone-100 border-b px-2 py-3 text-left transition hover:bg-stone-50"
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
									<span
										className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white font-bold text-white text-sm ${
											isCollecting
												? getAvatarColorClass(index + 1)
												: "bg-sky-500"
										}`}
									>
										{isCollecting ? getInitialFromName(member.memberName) : "Y"}
									</span>
									<ArrowRight className="h-4 w-4 text-stone-400" />
									<span
										className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white font-bold text-white text-sm ${
											isCollecting
												? "bg-sky-500"
												: getAvatarColorClass(index + 1)
										}`}
									>
										{isCollecting ? "Y" : getInitialFromName(member.memberName)}
									</span>
									<span className="min-w-0 text-stone-900 text-sm font-medium leading-tight">
										{isCollecting ? (
											<>
												{member.memberName}{" "}
												<span className="text-emerald-600">owes you</span>
											</>
										) : (
											<>
												You <span className="text-red-600">owe</span>{" "}
												{member.memberName}
											</>
										)}
									</span>
									<span
										className={`justify-self-end whitespace-nowrap font-bold text-sm ${
											isCollecting ? "text-emerald-600" : "text-red-600"
										}`}
									>
										{formatCurrencyAmount(Math.abs(member.balance), currency)}
									</span>
								</button>
							);
						})}
					</div>
				) : (
					<p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 py-6 text-center text-stone-500 text-sm">
						All settled up!
					</p>
				)}
			</div>

			{settleDialog ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/30 p-4 backdrop-blur-[2px]">
					<div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
						<h3 className="font-serif font-medium tracking-tight mb-2 text-stone-900 text-2xl">
							Confirm settlement
						</h3>
						<p className="mb-6 text-stone-500">
							{settleDialog.amount > 0
								? `Collect ${formatCurrencyAmount(
										settleDialog.amount,
										settleDialog.currency,
									)} from ${settleDialog.memberName}?`
								: `Pay ${formatCurrencyAmount(
										Math.abs(settleDialog.amount),
										settleDialog.currency,
									)} to ${settleDialog.memberName}?`}
						</p>
						<div className="grid grid-cols-2 gap-2">
							<button
								className="rounded-lg border border-stone-200 px-3 py-2.5 font-semibold text-stone-900 text-sm transition hover:border-sky-500 hover:text-sky-500"
								type="button"
								onClick={closeDialog}
							>
								Cancel
							</button>
							<button
								className="rounded-lg bg-sky-500 px-3 py-2.5 font-semibold text-sm text-white transition hover:bg-sky-600"
								type="button"
								onClick={handleSettle}
							>
								Settle
							</button>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}

function ExpenseCurrencyConversionButton(props: {
	defaultCurrency: string;
	groupIdNumber: number;
	options: Array<SettleUpConversionOption<Id<"users">>>;
	telegramUserId: number;
}) {
	const { mutate: convertSettleUpCurrency } = useMutation({
		mutationFn: useConvexMutation(api.groups.convertSettleUpCurrency),
	});
	const [isOpen, setIsOpen] = useState(false);
	const [selectedOptionId, setSelectedOptionId] = useState("");
	const [targetCurrency, setTargetCurrency] = useState("");
	const [conversionQuote, setConversionQuote] =
		useState<ConversionQuote | null>(null);
	const [convertedAmount, setConvertedAmount] = useState("");
	const [isFetchingConversion, setIsFetchingConversion] = useState(false);

	const optionId = (option: SettleUpConversionOption<Id<"users">>) =>
		option.settlementId;

	const selectedOption = () => {
		const selectedId = selectedOptionId || optionId(props.options[0]);
		return (
			props.options.find((option) => optionId(option) === selectedId) ??
			props.options[0]
		);
	};

	const targetCurrencyOptions = () =>
		filteredCurrencyCodes(selectedOption().currency);

	const defaultTargetCurrency = (sourceCurrency: string) => {
		const options = filteredCurrencyCodes(sourceCurrency);
		if (
			props.defaultCurrency !== sourceCurrency &&
			options.includes(props.defaultCurrency)
		) {
			return props.defaultCurrency;
		}
		return options[0] ?? "USD";
	};

	const resetQuote = () => {
		setConversionQuote(null);
		setConvertedAmount("");
	};

	const openDialog = () => {
		const option = props.options[0];
		setSelectedOptionId(optionId(option));
		setTargetCurrency(defaultTargetCurrency(option.currency));
		resetQuote();
		setIsOpen(true);
	};

	const closeDialog = () => {
		setIsOpen(false);
		resetQuote();
	};

	const handleSelectOption = (value: string) => {
		const option = props.options.find(
			(candidate) => optionId(candidate) === value,
		);
		if (!option) return;
		setSelectedOptionId(value);
		setTargetCurrency(defaultTargetCurrency(option.currency));
		resetQuote();
	};

	const handleGetConversion = async () => {
		const option = selectedOption();
		try {
			setIsFetchingConversion(true);
			const quote = await getCurrencyConversion({
				data: {
					amount: option.amount,
					fromCurrency: option.currency,
					toCurrency: targetCurrency,
				},
			});

			setConversionQuote(quote);
			setConvertedAmount(quote.convertedAmount.toFixed(2));
		} catch (error) {
			console.error("Failed to convert settle-up transaction:", error);
			alert("Failed to fetch a conversion rate. Please try again.");
		} finally {
			setIsFetchingConversion(false);
		}
	};

	const handleConfirmConversion = async () => {
		const option = selectedOption();
		const quote = conversionQuote;
		if (!quote) return;

		const finalConvertedAmount = Number(convertedAmount);
		if (!Number.isFinite(finalConvertedAmount) || finalConvertedAmount <= 0) {
			alert("Enter a converted amount greater than zero.");
			return;
		}

		try {
			await convertSettleUpCurrency({
				amount: option.amount,
				convertedAmount: finalConvertedAmount,
				fromCurrency: option.currency,
				payerId: option.payerId,
				receiverId: option.receiverId,
				telegramChatId: props.groupIdNumber,
				telegramUserId: props.telegramUserId,
				toCurrency: targetCurrency,
			});
			closeDialog();
		} catch (error) {
			console.error("Failed to convert settle-up transaction:", error);
			alert("Failed to convert settle-up transaction. Please try again.");
		}
	};

	return (
		<>
			<button
				className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-sky-50 px-2.5 py-1.5 font-semibold text-sky-500 text-xs transition hover:border-sky-500"
				type="button"
				onClick={openDialog}
			>
				<ArrowLeftRight className="h-3.5 w-3.5" /> Convert
			</button>

			{isOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-900/30 p-4 backdrop-blur-[2px]">
					<div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
						<h3 className="font-serif font-medium tracking-tight mb-2 text-stone-900 text-2xl">
							Convert transaction
						</h3>
						<p className="mb-5 text-stone-500 text-sm leading-6">
							Choose a settle-up balance involving you and one other member,
							then move that amount to another currency.
						</p>

						<div className="space-y-4">
							<div>
								<label
									className="mb-2 block font-semibold text-stone-500 text-sm"
									htmlFor="conversion-transaction"
								>
									Transaction
								</label>
								<select
									className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-stone-900 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
									id="conversion-transaction"
									value={optionId(selectedOption())}
									onInput={(event) =>
										handleSelectOption(event.currentTarget.value)
									}
								>
									{props.options.map((option) => (
										<option key={optionId(option)} value={optionId(option)}>
											{option.counterpartyName} -{" "}
											{formatCurrencyAmount(option.amount, option.currency)}
										</option>
									))}
								</select>
								<p className="mt-2 text-stone-400 text-xs">
									{selectedOption().payerId === selectedOption().counterpartyId
										? `${selectedOption().counterpartyName} owes you`
										: `You owe ${selectedOption().counterpartyName}`}{" "}
									{formatCurrencyAmount(
										selectedOption().amount,
										selectedOption().currency,
									)}
								</p>
							</div>

							<div>
								<label
									className="mb-2 block font-semibold text-stone-500 text-sm"
									htmlFor="conversion-target-currency"
								>
									Convert to
								</label>
								<div className="flex gap-2">
									<select
										className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-stone-900 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
										id="conversion-target-currency"
										value={targetCurrency}
										onInput={(event) => {
											setTargetCurrency(event.currentTarget.value);
											resetQuote();
										}}
									>
										{targetCurrencyOptions().map((currency) => (
											<option key={currency} value={currency}>
												{currency}
											</option>
										))}
									</select>
									<button
										className="shrink-0 rounded-lg border border-sky-500 px-3 py-2.5 font-semibold text-sky-500 text-sm transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
										disabled={isFetchingConversion}
										type="button"
										onClick={handleGetConversion}
									>
										{isFetchingConversion ? "Fetching..." : "Get rate"}
									</button>
								</div>
							</div>

							{conversionQuote ? (
								<div>
									<label
										className="mb-2 block font-semibold text-stone-500 text-sm"
										htmlFor="converted-transaction-amount"
									>
										Converted amount
									</label>
									<input
										className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-stone-900 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
										id="converted-transaction-amount"
										inputMode="decimal"
										min="0.01"
										step="0.01"
										type="number"
										value={convertedAmount}
										onInput={(event) =>
											setConvertedAmount(event.currentTarget.value)
										}
									/>
									<p className="mt-2 text-stone-400 text-xs">
										Rate {conversionQuote.rate.toFixed(6)}
										{conversionQuote.rateDate
											? ` on ${conversionQuote.rateDate}`
											: ""}
									</p>
								</div>
							) : null}

							<div className="grid grid-cols-2 gap-2">
								<button
									className="rounded-lg bg-sky-500 px-3 py-2.5 font-semibold text-sm text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-stone-300"
									disabled={!conversionQuote}
									type="button"
									onClick={handleConfirmConversion}
								>
									Confirm conversion
								</button>
								<button
									className="rounded-lg border border-stone-200 px-3 py-2.5 font-semibold text-stone-900 text-sm transition hover:border-sky-500 hover:text-sky-500"
									type="button"
									onClick={closeDialog}
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</>
	);
}

function AddExpenseButton(props: {
	telegramChatId: number;
	telegramUserId: number;
}) {
	return (
		<Link
			aria-label="Add expense"
			className="fixed right-6 bottom-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/25 transition hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-500/35 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 active:scale-95"
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
				tag: null,
			}}
			to="/app/groups/$groupId/add-expense"
		>
			<Plus className="h-6 w-6" />
		</Link>
	);
}

function EmptyExpenseState({ text }: { text: string }) {
	return (
		<div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-stone-500 text-sm">
			{text}
		</div>
	);
}

function getAvatarColorClass(index: number) {
	const classes = [
		"bg-sky-500",
		"bg-emerald-600",
		"bg-amber-600",
		"bg-violet-600",
		"bg-teal-700",
	];
	return classes[index % classes.length];
}

function getMemberDisplayName(member: GroupData["members"][number]) {
	const fullName = [member.firstName, member.lastName]
		.filter(Boolean)
		.join(" ");
	return fullName || member.username || "Unknown";
}

function getMemberInitial(member: GroupData["members"][number]) {
	return getInitialFromName(getMemberDisplayName(member));
}

function getInitialFromName(name: string) {
	return name.trim()[0]?.toUpperCase() || "?";
}

function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
			<LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-sky-500" />
		</div>
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
