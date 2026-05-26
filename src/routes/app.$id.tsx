import { createFileRoute, Link } from "@tanstack/solid-router";
import type { FunctionReturnType } from "convex/server";
import {
	AlertCircle,
	ArrowRight,
	Loader2,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-solid";
import { For, type JSX, Show } from "solid-js";
import { api } from "@/convex/_generated/api";
import { useQuery } from "../solid-convex";

export const Route = createFileRoute("/app/$id")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const params = Route.useParams();
	const { id } = params();
	const userId = Number(id);

	if (Number.isNaN(userId)) {
		return (
			<Shell>
				<EmptyState title="Invalid user" text="Telegram user id is invalid." />
			</Shell>
		);
	}

	return (
		<Shell>
			<Dashboard userId={userId} />
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
			{(data) => <DashboardContent data={data()} userId={userId} />}
		</Show>
	);
}

type DashboardData = FunctionReturnType<typeof api.groups.getDashboardData>;

function DashboardContent({
	data,
	userId,
}: {
	data: DashboardData;
	userId: number;
}) {
	const { stats, groupsWithPendingSplits, balancesByCurrency } = data;

	return (
		<div class="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-8 dark:from-gray-900 dark:to-gray-800">
			<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 pb-12 text-white dark:from-blue-600 dark:to-cyan-600">
				<h1 class="mb-2 text-3xl font-bold">NanaSplits</h1>
				<p class="text-blue-50">Your expense splitting dashboard</p>
			</div>

			<div class="-mt-8 px-6">
				<section class="mb-6 rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
					<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
						Your Balances
					</h2>
					<div class="mb-6 space-y-3">
						{balancesByCurrency.length === 0 ? (
							<p class="py-4 text-center text-gray-500 dark:text-gray-400">
								No pending balances
							</p>
						) : (
							<For each={balancesByCurrency}>
								{(currencyData) => <BalanceCard currencyData={currencyData} />}
							</For>
						)}
					</div>
					<div class="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
						<div class="flex items-center gap-2">
							<Users class="h-4 w-4 text-gray-600 dark:text-gray-400" />
							<span class="text-sm font-medium text-gray-600 dark:text-gray-400">
								Active Groups
							</span>
						</div>
						<p class="text-right text-2xl font-bold text-gray-900 dark:text-white">
							{stats.groupsWithPendingSplits}
						</p>
					</div>
				</section>

				<section class="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
					<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
						Active Groups
					</h2>
					{groupsWithPendingSplits.length > 0 ? (
						<div class="space-y-2">
							<For each={groupsWithPendingSplits}>
								{(group) => (
									<Link
										class="block rounded-xl border border-gray-200 p-4 transition-all hover:border-blue-500/50 dark:border-gray-700"
										params={{
											id: String(userId),
											groupId: String(group.telegramChatId),
										}}
										to="/app/$id/group/$groupId"
									>
										<div class="mb-3 flex items-start justify-between">
											<div>
												<h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
													{group.name}
												</h3>
												<p class="text-sm text-gray-500 dark:text-gray-400">
													{group.memberIds.length} members
												</p>
											</div>
											<ArrowRight class="h-5 w-5 text-gray-400" />
										</div>
										<div class="space-y-2">
											<For each={group.stats}>
												{(currencyStats) => {
													const isPositive = currencyStats.netAmount >= 0;
													return (
														<div
															class={`flex items-center justify-between rounded-lg p-3 ${
																isPositive
																	? "bg-green-50 dark:bg-green-900/20"
																	: "bg-red-50 dark:bg-red-900/20"
															}`}
														>
															<span class="text-sm font-medium text-gray-700 dark:text-gray-200">
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
							text="All your expenses are settled! 🎉"
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
			class={`rounded-xl border p-4 ${
				isPositive
					? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
					: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
			}`}
		>
			<div class="mb-3 flex items-center justify-between">
				<div>
					<span class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
						{currencyData.currency}
					</span>
					<p
						class={`text-2xl font-bold ${
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
				<div
					class={`rounded-full p-3 ${
						isPositive
							? "bg-green-100 text-green-600"
							: "bg-red-100 text-red-600"
					}`}
				>
					{isPositive ? (
						<TrendingUp class="h-6 w-6" />
					) : (
						<TrendingDown class="h-6 w-6" />
					)}
				</div>
			</div>
			{currencyData.memberBalances.length > 0 ? (
				<div class="mt-2 space-y-2 border-gray-200 border-t pt-3 dark:border-gray-700">
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
		<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
			<div class="text-center">
				<Loader2 class="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
				<p class="text-gray-600 dark:text-gray-400">{message}</p>
			</div>
		</div>
	);
}

function EmptyState({ title, text }: { title: string; text: string }) {
	return (
		<div class="py-8 text-center">
			<AlertCircle class="mx-auto mb-4 h-12 w-12 text-gray-400" />
			<h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
				{title}
			</h3>
			<p class="text-gray-600 dark:text-gray-400">{text}</p>
		</div>
	);
}

function formatCurrencyAmount(amount: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);
}
