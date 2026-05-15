import { useAuthActions } from "@convex-dev/auth/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { retrieveRawInitData } from "@tma.js/sdk";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useQuery,
} from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
	AlertCircle,
	ArrowRight,
	Loader2,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/app/$id")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const { id } = Route.useParams();
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
			<AuthLoading>
				<Loading message="Authenticating..." />
			</AuthLoading>
			<Unauthenticated>
				<SignInPanel />
			</Unauthenticated>
			<Authenticated>
				<Dashboard userId={userId} />
			</Authenticated>
		</Shell>
	);
}

function SignInPanel() {
	const { signIn } = useAuthActions();

	useEffect(() => {
		const initData = retrieveRawInitData() ?? "";
		void signIn("telegram", { initData });
	}, [signIn]);

	return <Loading message="Signing in with Telegram..." />;
}

function Dashboard({ userId }: { userId: number }) {
	const dashboardData = useQuery(api.groups.getDashboardData, { userId });

	if (dashboardData === undefined) {
		return <Loading message="Getting your data..." />;
	}

	const { stats, groupsWithPendingSplits, balancesByCurrency } = dashboardData;

	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-8 dark:from-gray-900 dark:to-gray-800">
			<div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 pb-12 text-white dark:from-blue-600 dark:to-cyan-600">
				<h1 className="mb-2 text-3xl font-bold">NanaSplits</h1>
				<p className="text-blue-50">Your expense splitting dashboard</p>
			</div>

			<div className="-mt-8 px-6">
				<section className="mb-6 rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
					<h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
						Your Balances
					</h2>
					<div className="mb-6 space-y-3">
						{balancesByCurrency.length === 0 ? (
							<p className="py-4 text-center text-gray-500 dark:text-gray-400">
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
					<div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700/50">
						<div className="flex items-center gap-2">
							<Users className="h-4 w-4 text-gray-600 dark:text-gray-400" />
							<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
								Active Groups
							</span>
						</div>
						<p className="text-right text-2xl font-bold text-gray-900 dark:text-white">
							{stats.groupsWithPendingSplits}
						</p>
					</div>
				</section>

				<section className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
					<h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
						Active Groups
					</h2>
					{groupsWithPendingSplits.length > 0 ? (
						<div className="space-y-2">
							{groupsWithPendingSplits.map((group) => (
								<Link
									className="block rounded-xl border border-gray-200 p-4 transition-all hover:border-blue-500/50 dark:border-gray-700"
									key={group._id}
									params={{
										id: String(userId),
										groupId: String(group.telegramChatId),
									}}
									to="/app/$id/group/$groupId"
								>
									<div className="mb-3 flex items-start justify-between">
										<div>
											<h3 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">
												{group.name}
											</h3>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{group.memberIds.length} members
											</p>
										</div>
										<ArrowRight className="h-5 w-5 text-gray-400" />
									</div>
									<div className="space-y-2">
										{group.stats.map((currencyStats) => {
											const isPositive = currencyStats.netAmount >= 0;
											return (
												<div
													className={`flex items-center justify-between rounded-lg p-3 ${
														isPositive
															? "bg-green-50 dark:bg-green-900/20"
															: "bg-red-50 dark:bg-red-900/20"
													}`}
													key={currencyStats.currency}
												>
													<span className="text-sm font-medium text-gray-700 dark:text-gray-200">
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
			className={`rounded-xl border p-4 ${
				isPositive
					? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
					: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
			}`}
		>
			<div className="mb-3 flex items-center justify-between">
				<div>
					<span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
						{currencyData.currency}
					</span>
					<p
						className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}
					>
						{isPositive ? "+" : ""}
						{formatCurrencyAmount(
							currencyData.netBalance,
							currencyData.currency,
						)}
					</p>
				</div>
				<div
					className={`rounded-full p-3 ${isPositive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
				>
					{isPositive ? (
						<TrendingUp className="h-6 w-6" />
					) : (
						<TrendingDown className="h-6 w-6" />
					)}
				</div>
			</div>
			{currencyData.memberBalances.length > 0 ? (
				<div className="mt-2 space-y-2 border-gray-200 border-t pt-3 dark:border-gray-700">
					{currencyData.memberBalances.map((member) => (
						<div
							className="flex items-center justify-between"
							key={member.memberId}
						>
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

function Shell({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}

function Loading({ message }: { message: string }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
			<div className="text-center">
				<Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
				<p className="text-gray-600 dark:text-gray-400">{message}</p>
			</div>
		</div>
	);
}

function EmptyState({ title, text }: { title: string; text: string }) {
	return (
		<div className="py-8 text-center">
			<AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
			<h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
				{title}
			</h3>
			<p className="text-gray-600 dark:text-gray-400">{text}</p>
		</div>
	);
}

function formatCurrencyAmount(amount: number, currency: string) {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
		amount,
	);
}
