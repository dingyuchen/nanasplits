import { createFileRoute, Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import {
	AlertCircle,
	ArrowRight,
	LoaderCircle,
	TrendingUp,
	Users,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { useQuery } from "#/convex-react";
import { getCurrencyConversion } from "#/currency-conversion";
import { useTelegramLaunchParams } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const { telegramUserId } = useTelegramLaunchParams();
	const userId = telegramUserId();

	return (
		<Shell>
			{userId === null ? (
				<Loading message="Getting your data..." />
			) : (
				<Dashboard userId={userId} />
			)}
		</Shell>
	);
}

function Dashboard({ userId }: { userId: number }) {
	const { data, isPending } = useQuery(api.groups.getDashboardData, { userId });

	if (isPending || !data) {
		return <Loading message="Getting your data..." />;
	}

	return <DashboardContent data={data} />;
}

type DashboardData = FunctionReturnType<typeof api.groups.getDashboardData>;
type BalanceData = DashboardData["balancesByCurrency"][number];
type SummaryMode = "hybrid" | "perCurrency";

type DashboardSummaryStats = {
	balanceCount: number;
	currencyCount: number;
	groupCount: number;
};

type HybridEstimate = {
	error: string | null;
	isPending: boolean;
	total: number | null;
};

const DASHBOARD_ESTIMATE_CURRENCY = "USD";

function DashboardContent({ data }: { data: DashboardData }) {
	const { stats, groupsWithPendingSplits, balancesByCurrency } = data;
	const [summaryMode, setSummaryMode] = useState<SummaryMode>("perCurrency");
	const balanceEntries = balancesByCurrency.filter(
		(currencyData) => currencyData.netBalance !== 0,
	);
	const balanceEntriesKey = balanceEntries
		.map(
			(currencyData) => `${currencyData.currency}:${currencyData.netBalance}`,
		)
		.join("|");
	const summaryStats: DashboardSummaryStats = {
		balanceCount: groupsWithPendingSplits.reduce(
			(total, group) => total + group.stats.length,
			0,
		),
		currencyCount: balanceEntries.length,
		groupCount: stats.groupsWithPendingSplits,
	};
	const hybridEstimate = useHybridEstimate(
		balanceEntries,
		balanceEntriesKey,
		DASHBOARD_ESTIMATE_CURRENCY,
	);

	return (
		<div className="min-h-screen bg-stone-50 text-stone-900">
			<div className="relative mx-auto my-8 max-w-[430px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm max-[480px]:my-0 max-[480px]:min-h-screen max-[480px]:rounded-none max-[480px]:border-0">
				<header className="flex items-center justify-between border-stone-100 border-b px-5 py-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500" />
					<h1 className="font-serif font-medium tracking-tight text-stone-900 text-xl">
						NanaSplits
					</h1>
					<div className="flex h-8 min-w-8 items-center justify-center gap-1 rounded-md text-sky-500">
						<Users className="h-4 w-4" />
						<span className="font-semibold text-xs">
							{stats.groupsWithPendingSplits}
						</span>
					</div>
				</header>

				<div className="p-5">
					<div className="mb-6 border-stone-100 border-b pb-4">
						<p className="mb-1 font-semibold text-stone-400 text-[0.6875rem] uppercase tracking-tight">
							Dashboard
						</p>
						<h2 className="font-serif font-medium tracking-tight text-stone-900 text-[1.75rem] leading-tight">
							Your balances
						</h2>
						<p className="mt-1 text-stone-400 text-sm">
							{stats.groupsWithPendingSplits} active{" "}
							{stats.groupsWithPendingSplits === 1 ? "group" : "groups"}
						</p>
					</div>

					<section className="mb-6 space-y-3">
						{balanceEntries.length === 0 ? (
							<p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 py-8 text-center text-stone-500 text-sm">
								No pending balances
							</p>
						) : (
							<>
								<BalanceSummaryToggle
									mode={summaryMode}
									onChange={setSummaryMode}
								/>
								{summaryMode === "hybrid" ? (
									<HybridBalanceSummary
										balancesByCurrency={balanceEntries}
										estimate={hybridEstimate}
										stats={summaryStats}
										targetCurrency={DASHBOARD_ESTIMATE_CURRENCY}
									/>
								) : (
									<PerCurrencyBalanceSummary
										balancesByCurrency={balanceEntries}
										stats={summaryStats}
									/>
								)}
							</>
						)}
					</section>

					<section>
						<div className="mb-3 flex items-center gap-2 border-stone-100 border-b pb-2">
							<h3 className="font-serif font-medium tracking-tight text-stone-900 text-lg">
								Active groups
							</h3>
							<span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-400 text-[0.6875rem]">
								{groupsWithPendingSplits.length}
							</span>
						</div>
						{groupsWithPendingSplits.length > 0 ? (
							<div>
								{groupsWithPendingSplits.map((group) => (
									<Link
										key={group._id}
										className="flex items-center justify-between gap-4 border-stone-100 border-b px-1 py-3.5 text-stone-900 transition hover:bg-stone-50"
										params={{
											groupId: String(group.telegramChatId),
										}}
										to="/app/groups/$groupId"
									>
										<div className="min-w-0">
											<h3 className="truncate font-semibold text-stone-900">
												{group.name}
											</h3>
											<p className="text-stone-400 text-xs">
												{group.memberIds.length} members
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-2">
											<div className="text-right">
												{group.stats.map((currencyStats) => {
													const isPositive = currencyStats.netAmount >= 0;
													return (
														<div
															key={currencyStats.currency}
															className={
																isPositive
																	? "font-semibold text-emerald-600 text-sm"
																	: "font-semibold text-red-600 text-sm"
															}
														>
															{isPositive ? "+" : ""}
															{formatCurrencyAmount(
																currencyStats.netAmount,
																currencyStats.currency,
															)}
														</div>
													);
												})}
											</div>
											<ArrowRight className="h-4 w-4 text-stone-400" />
										</div>
									</Link>
								))}
							</div>
						) : (
							<EmptyState
								title="No Pending Splits"
								text="All expenses are settled."
							/>
						)}
					</section>
				</div>
			</div>
		</div>
	);
}

function BalanceSummaryToggle(props: {
	mode: SummaryMode;
	onChange: (mode: SummaryMode) => void;
}) {
	return (
		<div
			aria-label="Balance summary view"
			className="grid grid-cols-2 rounded-full bg-stone-100 p-1"
			role="tablist"
		>
			<BalanceSummaryToggleButton
				isActive={props.mode === "perCurrency"}
				label="Per-currency"
				onClick={() => props.onChange("perCurrency")}
			/>
			<BalanceSummaryToggleButton
				isActive={props.mode === "hybrid"}
				label="Hybrid estimate"
				onClick={() => props.onChange("hybrid")}
			/>
		</div>
	);
}

function BalanceSummaryToggleButton(props: {
	isActive: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			aria-selected={props.isActive}
			className={cn(
				"min-h-10 rounded-full px-3 font-semibold text-sm transition",
				props.isActive
					? "bg-cyan-400 text-stone-950 shadow-sm ring-2 ring-white"
					: "text-stone-400 hover:text-stone-600",
			)}
			role="tab"
			type="button"
			onClick={props.onClick}
		>
			{props.label}
		</button>
	);
}

function HybridBalanceSummary(props: {
	balancesByCurrency: BalanceData[];
	estimate: HybridEstimate;
	stats: DashboardSummaryStats;
	targetCurrency: string;
}) {
	const estimateTotal = props.estimate.total;
	const isNegative =
		estimateTotal !== null && !props.estimate.error && estimateTotal < 0;
	const estimateAmountClass =
		estimateTotal === null || props.estimate.error
			? "text-stone-900"
			: estimateTotal < 0
				? "text-red-600"
				: estimateTotal > 0
					? "text-emerald-600"
					: "text-stone-900";

	return (
		<div
			className={cn(
				"rounded-2xl border p-5 shadow-sm",
				props.estimate.error
					? "border-stone-200 bg-stone-50"
					: isNegative
						? "border-red-200 bg-red-50"
						: "border-emerald-200 bg-emerald-50",
			)}
		>
			<div className="flex items-center gap-2 text-stone-700">
				<TrendingUp className="h-4 w-4" />
				<span className="font-medium text-sm">Total across all groups</span>
			</div>

			<div className="mt-5">
				{props.estimate.isPending ? (
					<div className="flex min-h-14 items-center gap-2 font-bold text-2xl text-stone-950">
						<LoaderCircle className="h-5 w-5 animate-spin" />
						<span>Calculating...</span>
					</div>
				) : props.estimate.error ? (
					<p className="min-h-14 font-bold text-2xl text-stone-900">
						Estimate unavailable
					</p>
				) : (
					<div
						className={cn(
							"flex min-w-0 items-start gap-2",
							estimateAmountClass,
						)}
					>
						<span className="mt-1 font-bold text-3xl leading-none">
							&asymp;
						</span>
						<p className="min-w-0 font-bold text-[2.75rem] leading-none tabular-nums [overflow-wrap:anywhere]">
							{formatCurrencyAmount(
								props.estimate.total ?? 0,
								props.targetCurrency,
							)}
						</p>
					</div>
				)}
				<p className="mt-2 text-stone-700 text-sm">
					estimated in {props.targetCurrency} &middot; rates approximate
				</p>
			</div>

			<div className="mt-5 flex flex-wrap gap-2">
				{props.balancesByCurrency.map((currencyData) => {
					const balanceTone =
						currencyData.netBalance < 0
							? "bg-red-100 text-red-700"
							: currencyData.netBalance > 0
								? "bg-emerald-100 text-emerald-700"
								: "bg-stone-100 text-stone-500";

					return (
						<span
							key={currencyData.currency}
							className={cn(
								"rounded-full px-3 py-1.5 font-semibold text-xs tabular-nums",
								balanceTone,
							)}
						>
							{formatSignedCurrencyAmount(
								currencyData.netBalance,
								currencyData.currency,
							)}
						</span>
					);
				})}
			</div>

			<DashboardStatStrip
				className="mt-5 border-stone-200 border-t pt-4 text-stone-500"
				stats={props.stats}
			/>
		</div>
	);
}

function PerCurrencyBalanceSummary(props: {
	balancesByCurrency: BalanceData[];
	stats: DashboardSummaryStats;
}) {
	return (
		<div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
			<div className="flex items-center gap-2 text-stone-500">
				<Users className="h-4 w-4" />
				<span className="font-medium text-sm">Total across all groups</span>
			</div>

			<div className="mt-3 divide-y divide-stone-200">
				{props.balancesByCurrency.map((currencyData) => {
					const isPositive = currencyData.netBalance > 0;
					return (
						<div
							key={currencyData.currency}
							className="grid grid-cols-[4rem_minmax(0,1fr)] items-baseline gap-4 py-4"
						>
							<span className="font-semibold text-stone-400 text-sm">
								{currencyData.currency}
							</span>
							<span
								className={cn(
									"text-right font-bold text-[1.875rem] leading-none tabular-nums [overflow-wrap:anywhere]",
									isPositive ? "text-emerald-600" : "text-red-600",
								)}
							>
								{formatSignedCurrencyAmount(
									currencyData.netBalance,
									currencyData.currency,
								)}
							</span>
						</div>
					);
				})}
			</div>

			<DashboardStatStrip
				className="mt-2 border-stone-200 border-t pt-4 text-stone-500"
				stats={props.stats}
			/>
		</div>
	);
}

function DashboardStatStrip(props: {
	className?: string;
	stats: DashboardSummaryStats;
}) {
	return (
		<div
			className={cn(
				"grid grid-cols-3 gap-3 font-medium text-sm",
				props.className,
			)}
		>
			<span>{formatCount(props.stats.groupCount, "group")}</span>
			<span>{formatCount(props.stats.balanceCount, "balance")}</span>
			<span>{formatCount(props.stats.currencyCount, "currency")}</span>
		</div>
	);
}

function useHybridEstimate(
	balancesByCurrency: BalanceData[],
	balanceEntriesKey: string,
	targetCurrency: string,
) {
	const [estimate, setEstimate] = useState<HybridEstimate>({
		error: null,
		isPending: false,
		total: 0,
	});

	useEffect(() => {
		if (balancesByCurrency.length === 0) {
			setEstimate({
				error: null,
				isPending: false,
				total: 0,
			});
			return;
		}

		let isCancelled = false;

		const loadEstimate = async () => {
			setEstimate({
				error: null,
				isPending: true,
				total: null,
			});

			try {
				const convertedBalances = await Promise.all(
					balancesByCurrency.map(async (currencyData) => {
						if (currencyData.currency === targetCurrency) {
							return currencyData.netBalance;
						}

						const sign = currencyData.netBalance < 0 ? -1 : 1;
						const quote = await getCurrencyConversion({
							data: {
								amount: Math.abs(currencyData.netBalance),
								fromCurrency: currencyData.currency,
								toCurrency: targetCurrency,
							},
						});

						return quote.convertedAmount * sign;
					}),
				);

				if (isCancelled) return;

				setEstimate({
					error: null,
					isPending: false,
					total: roundMoney(
						convertedBalances.reduce(
							(total, convertedAmount) => total + convertedAmount,
							0,
						),
					),
				});
			} catch (error) {
				console.error("Failed to estimate dashboard balance:", error);
				if (isCancelled) return;
				setEstimate({
					error: "Failed to fetch exchange rates",
					isPending: false,
					total: null,
				});
			}
		};

		void loadEstimate();

		return () => {
			isCancelled = true;
		};
	}, [balanceEntriesKey, targetCurrency]);

	return estimate;
}

function Shell({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

function Loading({ message }: { message: string }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
			<div className="text-center">
				<LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-sky-500" />
				<p className="text-stone-500 text-sm">{message}</p>
			</div>
		</div>
	);
}

function EmptyState({ title, text }: { title: string; text: string }) {
	return (
		<div className="rounded-lg border border-dashed border-stone-200 bg-stone-50 py-8 text-center">
			<AlertCircle className="mx-auto mb-3 h-8 w-8 text-stone-400" />
			<h3 className="font-serif font-medium tracking-tight mb-1 text-stone-500 text-lg">
				{title}
			</h3>
			<p className="text-stone-400 text-sm">{text}</p>
		</div>
	);
}

function formatCurrencyAmount(amount: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);
}

function formatSignedCurrencyAmount(amount: number, currency: string) {
	const prefix = amount > 0 ? "+" : "";
	return `${prefix}${formatCurrencyAmount(amount, currency)}`;
}

function formatCount(count: number, singular: string) {
	return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function roundMoney(amount: number) {
	return Math.round((amount + Number.EPSILON) * 100) / 100;
}
