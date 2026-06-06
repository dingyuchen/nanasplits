import { createFileRoute, Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { AlertCircle, ArrowRight, LoaderCircle, Users } from "lucide-react";
import type { ReactNode } from "react";

import { useQuery } from "#/convex-react";
import { useTelegramLaunch } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/app/")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const { telegramUserId } = useTelegramLaunch();
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

function DashboardContent({ data }: { data: DashboardData }) {
	const { stats, groupsWithPendingSplits, balancesByCurrency } = data;

	return (
		<div className="min-h-screen bg-slate-50 pb-8 text-gray-950 dark:bg-gray-950 dark:text-white">
			<div className="mx-auto max-w-2xl px-4 pt-6">
				<header className="mb-5 border-gray-200 border-b pb-5 dark:border-gray-800">
					<p className="mb-2 font-medium text-cyan-700 text-xs uppercase dark:text-cyan-300">
						Dashboard
					</p>
					<h1 className="font-semibold text-3xl tracking-tight">NanaSplits</h1>
					<p className="mt-2 text-gray-500 text-sm dark:text-gray-400">
						Open balances and active Telegram groups.
					</p>
				</header>

				<section className="mb-4 rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="font-semibold text-gray-900 text-sm uppercase dark:text-white">
							Your balances
						</h2>
						<div className="flex items-center gap-2 rounded-sm bg-slate-100 px-2.5 py-1.5 dark:bg-gray-800">
							<Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
							<span className="font-semibold text-gray-900 text-sm dark:text-white">
								{stats.groupsWithPendingSplits}
							</span>
						</div>
					</div>
					<div className="space-y-2">
						{balancesByCurrency.length === 0 ? (
							<p className="rounded-sm border border-dashed border-gray-200 py-6 text-center text-gray-500 text-sm dark:border-gray-800 dark:text-gray-400">
								No pending balances
							</p>
						) : (
							balancesByCurrency.map((currencyData) => (
								<BalanceCard
									key={currencyData.currency}
									currencyData={currencyData}
								/>
							))
						)}
					</div>
				</section>

				<section className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<h2 className="mb-3 font-semibold text-gray-900 text-sm uppercase dark:text-white">
						Active groups
					</h2>
					{groupsWithPendingSplits.length > 0 ? (
						<div className="space-y-2">
							{groupsWithPendingSplits.map((group) => (
								<Link
									key={group._id}
									className="block rounded-sm border border-gray-200 bg-slate-50 p-3 transition-colors hover:border-cyan-500 hover:bg-white dark:border-gray-800 dark:bg-gray-950 dark:hover:border-cyan-700 dark:hover:bg-gray-900"
									params={{
										groupId: String(group.telegramChatId),
									}}
									to="/app/groups/$groupId"
								>
									<div className="mb-3 flex items-start justify-between gap-3">
										<div>
											<h3 className="font-semibold text-gray-900 dark:text-white">
												{group.name}
											</h3>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{group.memberIds.length} members
											</p>
										</div>
										<ArrowRight className="h-5 w-5 text-gray-400" />
									</div>
									<div className="grid gap-2">
										{group.stats.map((currencyStats) => {
											const isPositive = currencyStats.netAmount >= 0;
											return (
												<div
													key={currencyStats.currency}
													className={`flex items-center justify-between rounded-sm border px-3 py-2 ${
														isPositive
															? "border-green-200 bg-green-50 dark:border-green-900/70 dark:bg-green-950/30"
															: "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30"
													}`}
												>
													<span className="font-medium text-gray-700 text-sm dark:text-gray-200">
														{currencyStats.currency}
													</span>
													<span
														className={
															isPositive
																? "font-semibold text-green-600"
																: "font-semibold text-red-600"
														}
													>
														{isPositive ? "+" : ""}
														{formatCurrencyAmount(
															currencyStats.netAmount,
															currencyStats.currency,
														)}
													</span>
												</div>
											);
										})}
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
	);
}

type BalanceData = FunctionReturnType<
	typeof api.groups.getDashboardData
>["balancesByCurrency"][number];

function BalanceCard({ currencyData }: { currencyData: BalanceData }) {
	const isPositive = currencyData.netBalance >= 0;
	return (
		<div
			className={`rounded-sm border p-3 ${
				isPositive
					? "border-green-200 bg-green-50 dark:border-green-900/70 dark:bg-green-950/30"
					: "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30"
			}`}
		>
			<div className="flex items-center justify-between">
				<div>
					<span className="mb-1 block font-medium text-gray-600 text-xs uppercase dark:text-gray-400">
						{currencyData.currency}
					</span>
					<p
						className={`font-semibold text-2xl ${
							isPositive ? "text-green-600" : "text-red-600"
						}`}
					>
						{isPositive ? "+" : ""}
						{formatCurrencyAmount(
							currencyData.netBalance,
							currencyData.currency,
						)}
					</p>
				</div>
			</div>
			{currencyData.memberBalances.length > 0 ? (
				<div className="mt-3 space-y-2 border-gray-200 border-t pt-3 dark:border-gray-800">
					{currencyData.memberBalances.map((member) => (
						<div className="flex items-center justify-between">
							<span className="text-sm text-gray-700 dark:text-gray-200">
								{member.memberName}
							</span>
							<span className="text-sm font-semibold text-gray-900 dark:text-white">
								{formatCurrencyAmount(
									Math.abs(member.balance),
									currencyData.currency,
								)}
							</span>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}

function Shell({ children }: { children: ReactNode }) {
	return <>{children}</>;
}

function Loading({ message }: { message: string }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-gray-950">
			<div className="text-center">
				<LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
				<p className="text-gray-500 text-sm dark:text-gray-400">{message}</p>
			</div>
		</div>
	);
}

function EmptyState({ title, text }: { title: string; text: string }) {
	return (
		<div className="rounded-sm border border-dashed border-gray-200 py-8 text-center dark:border-gray-800">
			<AlertCircle className="mx-auto mb-3 h-8 w-8 text-gray-400" />
			<h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
				{title}
			</h3>
			<p className="text-gray-500 text-sm dark:text-gray-400">{text}</p>
		</div>
	);
}

function formatCurrencyAmount(amount: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);
}
