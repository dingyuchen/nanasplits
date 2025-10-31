import { createFileRoute } from "@tanstack/react-router";
import { useLaunchParams } from "@tma.js/sdk-react";
import { isTMA } from "@tma.js/sdk";
import { useMemo } from "react";
import {
	Users,
	Receipt,
	TrendingUp,
	TrendingDown,
	DollarSign,
	AlertCircle,
	Loader2,
	MessageSquare,
	ExternalLink,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/app")({
	component: AppContent,
});

async function AppContent() {
	// Check if we're in Telegram environment directly
	const isTelegram = await isTMA("complete");

	// Show error page if not in Telegram
	if (!isTelegram) {
		return <TelegramRequiredPage />;
	}

	// Only render Telegram app component when in Telegram environment
	return <TelegramApp />;
}

function TelegramApp() {
	const launchParams = useLaunchParams();

	// Get user ID from Telegram SDK
	const userId = useMemo(() => {
		return launchParams.tgWebAppData?.user?.id?.toString();
	}, [launchParams]);

	// Fetch overall stats
	const stats = useQuery(
		api.groups.getOverallStats,
		userId ? { userId } : ("skip" as const),
	);

	// Fetch groups with pending splits
	const groupsWithPendingSplits = useQuery(
		api.groups.getGroupsWithPendingSplits,
		userId ? { userId } : ("skip" as const),
	);

	if (!userId) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
				<div className="text-center">
					<Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
					<p className="text-gray-600 dark:text-gray-400">
						Initializing Telegram Mini App...
					</p>
				</div>
			</div>
		);
	}

	if (stats === undefined || groupsWithPendingSplits === undefined) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
				<div className="text-center">
					<Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
					<p className="text-gray-600 dark:text-gray-400">Loading stats...</p>
				</div>
			</div>
		);
	}

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 pb-8">
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 text-white p-6 pb-12">
				<h1 className="text-3xl font-bold mb-2">NanaSplits</h1>
				<p className="text-blue-50">Your expense splitting dashboard</p>
			</div>

			{/* Overall Stats */}
			<div className="px-6 -mt-8">
				<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
						Overall Statistics
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
						<div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-red-700 dark:text-red-300">
									You Owe
								</span>
								<TrendingDown className="w-5 h-5 text-red-500" />
							</div>
							<p className="text-2xl font-bold text-red-600 dark:text-red-400">
								{formatCurrency(stats.totalOwed)}
							</p>
						</div>

						<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-green-700 dark:text-green-300">
									Owed to You
								</span>
								<TrendingUp className="w-5 h-5 text-green-500" />
							</div>
							<p className="text-2xl font-bold text-green-600 dark:text-green-400">
								{formatCurrency(stats.totalOwedToMe)}
							</p>
						</div>

						<div
							className={`${
								stats.netAmount >= 0
									? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
									: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
							} border rounded-xl p-4`}
						>
							<div className="flex items-center justify-between mb-2">
								<span
									className={`text-sm font-medium ${
										stats.netAmount >= 0
											? "text-blue-700 dark:text-blue-300"
											: "text-orange-700 dark:text-orange-300"
									}`}
								>
									Net Balance
								</span>
								<DollarSign
									className={`w-5 h-5 ${
										stats.netAmount >= 0 ? "text-blue-500" : "text-orange-500"
									}`}
								/>
							</div>
							<p
								className={`text-2xl font-bold ${
									stats.netAmount >= 0
										? "text-blue-600 dark:text-blue-400"
										: "text-orange-600 dark:text-orange-400"
								}`}
							>
								{formatCurrency(Math.abs(stats.netAmount))}
								{stats.netAmount >= 0 ? " ↑" : " ↓"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
							<div className="flex items-center gap-2 mb-1">
								<Receipt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
								<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
									Pending Expenses
								</span>
							</div>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">
								{stats.totalPendingExpenses}
							</p>
						</div>

						<div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
							<div className="flex items-center gap-2 mb-1">
								<Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
								<span className="text-sm font-medium text-gray-600 dark:text-gray-400">
									Active Groups
								</span>
							</div>
							<p className="text-2xl font-bold text-gray-900 dark:text-white">
								{stats.groupsWithPendingSplits}
							</p>
						</div>
					</div>
				</div>

				{/* Groups with Pending Splits */}
				{groupsWithPendingSplits.length > 0 ? (
					<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
							Groups with Pending Splits
						</h2>
						<div className="space-y-4">
							{groupsWithPendingSplits.map((group) => (
								<div
									key={group._id}
									className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all"
								>
									<div className="flex items-start justify-between mb-3">
										<div>
											<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
												{group.name}
											</h3>
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{group.memberIds.length} members
											</p>
										</div>
										{group.stats.pendingSplitsCount > 0 && (
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
												{group.stats.pendingSplitsCount} pending
											</span>
										)}
									</div>

									<div className="grid grid-cols-2 gap-3">
										<div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
											<p className="text-xs text-red-700 dark:text-red-300 mb-1">
												You Owe
											</p>
											<p className="text-lg font-semibold text-red-600 dark:text-red-400">
												{formatCurrency(group.stats.totalOwed)}
											</p>
										</div>
										<div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
											<p className="text-xs text-green-700 dark:text-green-300 mb-1">
												Owed to You
											</p>
											<p className="text-lg font-semibold text-green-600 dark:text-green-400">
												{formatCurrency(group.stats.totalOwedToMe)}
											</p>
										</div>
									</div>

									{group.stats.netAmount !== 0 && (
										<div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
											<p className="text-sm text-gray-600 dark:text-gray-400">
												<span className="font-medium">Net:</span>{" "}
												<span
													className={
														group.stats.netAmount >= 0
															? "text-green-600 dark:text-green-400"
															: "text-red-600 dark:text-red-400"
													}
												>
													{group.stats.netAmount >= 0 ? "+" : "-"}
													{formatCurrency(Math.abs(group.stats.netAmount))}
												</span>
											</p>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				) : (
					<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
						<div className="text-center py-8">
							<AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
								No Pending Splits
							</h3>
							<p className="text-gray-600 dark:text-gray-400">
								All your expenses are settled! 🎉
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function TelegramRequiredPage() {
	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
			<div className="max-w-md w-full text-center">
				<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
					<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-6">
						<MessageSquare className="w-10 h-10 text-white" />
					</div>

					<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
						Open in Telegram
					</h1>

					<p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
						NanaSplits is a Telegram Mini App and can only be accessed from
						within Telegram.
					</p>

					<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
						<div className="flex items-start gap-3">
							<AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
							<div className="text-left">
								<p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
									How to open:
								</p>
								<ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
									<li>Open Telegram on your device</li>
									<li>Navigate to the bot or group</li>
									<li>Tap the menu button to launch the app</li>
								</ol>
							</div>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-3">
						<a
							href="https://telegram.org/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-500/30"
						>
							<span>Open Telegram</span>
							<ExternalLink className="w-4 h-4" />
						</a>
					</div>

					<p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
						Don't have Telegram?{" "}
						<a
							href="https://telegram.org/apps"
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
						>
							Download it here
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
