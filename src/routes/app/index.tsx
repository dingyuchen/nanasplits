import { createFileRoute, Link } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { AlertCircle, ArrowRight, LoaderCircle, Users } from "lucide-react";
import type { ReactNode } from "react";

import { useQuery } from "#/convex-react";
import { useTelegramLaunchParams } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";

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

function DashboardContent({ data }: { data: DashboardData }) {
	const { stats, groupsWithPendingSplits, balancesByCurrency } = data;

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

					<section className="mb-6">
						<div className="grid grid-cols-2 gap-3 max-[480px]:grid-cols-1">
							{balancesByCurrency.length === 0 ? (
								<p className="col-span-full rounded-lg border border-dashed border-stone-200 bg-stone-50 py-8 text-center text-stone-500 text-sm">
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

type BalanceData = FunctionReturnType<
	typeof api.groups.getDashboardData
>["balancesByCurrency"][number];

function BalanceCard({ currencyData }: { currencyData: BalanceData }) {
	const isPositive = currencyData.netBalance >= 0;
	return (
		<div
			className={`rounded-lg border p-4 ${
				isPositive
					? "border-emerald-200 bg-emerald-50"
					: "border-red-200 bg-red-50"
			}`}
		>
			<div>
				<span className="mb-1 block font-semibold text-stone-400 text-[0.6875rem] uppercase tracking-tight">
					{currencyData.currency}
				</span>
				<p
					className={`font-bold text-[1.625rem] leading-tight tracking-tight ${
						isPositive ? "text-emerald-600" : "text-red-600"
					}`}
				>
					{isPositive ? "+" : ""}
					{formatCurrencyAmount(currencyData.netBalance, currencyData.currency)}
				</p>
			</div>
			{currencyData.memberBalances.length > 0 ? (
				<div className="mt-3 space-y-2 border-black/5 border-t pt-3">
					{currencyData.memberBalances.map((member) => (
						<div
							key={member.memberId}
							className="flex items-center justify-between"
						>
							<span className="text-stone-500 text-xs">
								{member.memberName}
							</span>
							<span className="font-semibold text-stone-900 text-xs">
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
