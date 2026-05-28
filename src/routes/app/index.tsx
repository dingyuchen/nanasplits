import { createFileRoute, Link } from "@tanstack/solid-router";
import type { FunctionReturnType } from "convex/server";
import { AlertCircle, ArrowRight, Loader2, Users } from "lucide-solid";
import { For, type JSX, Show } from "solid-js";

import { useQuery } from "#/solid-convex";
import { useTelegramLaunch } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/app/")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const { telegramUserId } = useTelegramLaunch();

	return (
		<Shell>
			<Show
				when={telegramUserId()}
				fallback={<Loading message="Getting your data..." />}
			>
				{(userId) => <Dashboard userId={userId()} />}
			</Show>
		</Shell>
	);
}

function Dashboard({ userId }: { userId: number }) {
	const dashboardData = useQuery(api.groups.getDashboardData, { userId });

	return (
		<Show
			when={dashboardData()}
			fallback={<Loading message="Getting your data..." />}
		>
			{(data) => <DashboardContent data={data()} />}
		</Show>
	);
}

type DashboardData = FunctionReturnType<typeof api.groups.getDashboardData>;

function DashboardContent({ data }: { data: DashboardData }) {
	const { stats, groupsWithPendingSplits, balancesByCurrency } = data;

	return (
		<div class="min-h-screen bg-slate-50 pb-8 text-gray-950 dark:bg-gray-950 dark:text-white">
			<div class="mx-auto max-w-2xl px-4 pt-6">
				<header class="mb-5 border-gray-200 border-b pb-5 dark:border-gray-800">
					<p class="mb-2 font-medium text-cyan-700 text-xs uppercase dark:text-cyan-300">
						Dashboard
					</p>
					<h1 class="font-semibold text-3xl tracking-tight">NanaSplits</h1>
					<p class="mt-2 text-gray-500 text-sm dark:text-gray-400">
						Open balances and active Telegram groups.
					</p>
				</header>

				<section class="mb-4 rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="font-semibold text-gray-900 text-sm uppercase dark:text-white">
							Your balances
						</h2>
						<div class="flex items-center gap-2 rounded-sm bg-slate-100 px-2.5 py-1.5 dark:bg-gray-800">
							<Users class="h-4 w-4 text-gray-500 dark:text-gray-400" />
							<span class="font-semibold text-gray-900 text-sm dark:text-white">
								{stats.groupsWithPendingSplits}
							</span>
						</div>
					</div>
					<div class="space-y-2">
						{balancesByCurrency.length === 0 ? (
							<p class="rounded-sm border border-dashed border-gray-200 py-6 text-center text-gray-500 text-sm dark:border-gray-800 dark:text-gray-400">
								No pending balances
							</p>
						) : (
							<For each={balancesByCurrency}>
								{(currencyData) => <BalanceCard currencyData={currencyData} />}
							</For>
						)}
					</div>
				</section>

				<section class="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<h2 class="mb-3 font-semibold text-gray-900 text-sm uppercase dark:text-white">
						Active groups
					</h2>
					{groupsWithPendingSplits.length > 0 ? (
						<div class="space-y-2">
							<For each={groupsWithPendingSplits}>
								{(group) => (
									<Link
										class="block rounded-sm border border-gray-200 bg-slate-50 p-3 transition-colors hover:border-cyan-500 hover:bg-white dark:border-gray-800 dark:bg-gray-950 dark:hover:border-cyan-700"
										params={{
											groupId: String(group.telegramChatId),
										}}
										to="/app/groups/$groupId"
									>
										<div class="mb-3 flex items-start justify-between gap-3">
											<div>
												<h3 class="font-semibold text-gray-900 dark:text-white">
													{group.name}
												</h3>
												<p class="text-sm text-gray-500 dark:text-gray-400">
													{group.memberIds.length} members
												</p>
											</div>
											<ArrowRight class="h-5 w-5 text-gray-400" />
										</div>
										<div class="grid gap-2">
											<For each={group.stats}>
												{(currencyStats) => {
													const isPositive = currencyStats.netAmount >= 0;
													return (
														<div
															class={`flex items-center justify-between rounded-sm border px-3 py-2 ${
																isPositive
																	? "border-green-200 bg-green-50 dark:border-green-900/70 dark:bg-green-950/30"
																	: "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30"
															}`}
														>
															<span class="font-medium text-gray-700 text-sm dark:text-gray-200">
																{currencyStats.currency}
															</span>
															<span
																class={
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
												}}
											</For>
										</div>
									</Link>
								)}
							</For>
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
			class={`rounded-sm border p-3 ${
				isPositive
					? "border-green-200 bg-green-50 dark:border-green-900/70 dark:bg-green-950/30"
					: "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30"
			}`}
		>
			<div class="flex items-center justify-between">
				<div>
					<span class="mb-1 block font-medium text-gray-600 text-xs uppercase dark:text-gray-400">
						{currencyData.currency}
					</span>
					<p
						class={`font-semibold text-2xl ${
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
				<div class="mt-3 space-y-2 border-gray-200 border-t pt-3 dark:border-gray-800">
					<For each={currencyData.memberBalances}>
						{(member) => (
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-700 dark:text-gray-200">
									{member.memberName}
								</span>
								<span class="text-sm font-semibold text-gray-900 dark:text-white">
									{formatCurrencyAmount(
										Math.abs(member.balance),
										currencyData.currency,
									)}
								</span>
							</div>
						)}
					</For>
				</div>
			) : null}
		</div>
	);
}

function Shell({ children }: { children: JSX.Element }) {
	return <>{children}</>;
}

function Loading({ message }: { message: string }) {
	return (
		<div class="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-gray-950">
			<div class="text-center">
				<Loader2 class="mx-auto mb-4 h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
				<p class="text-gray-500 text-sm dark:text-gray-400">{message}</p>
			</div>
		</div>
	);
}

function EmptyState({ title, text }: { title: string; text: string }) {
	return (
		<div class="rounded-sm border border-dashed border-gray-200 py-8 text-center dark:border-gray-800">
			<AlertCircle class="mx-auto mb-3 h-8 w-8 text-gray-400" />
			<h3 class="mb-1 font-semibold text-gray-900 dark:text-white">{title}</h3>
			<p class="text-gray-500 text-sm dark:text-gray-400">{text}</p>
		</div>
	);
}

function formatCurrencyAmount(amount: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);
}
