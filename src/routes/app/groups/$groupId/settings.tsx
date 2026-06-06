import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft, Check, Globe, LoaderCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { TelegramMainButton } from "#/components/telegram-main-button";
import NotFound from "#/components/ui/not-found";
import { useQuery } from "#/convex-react";
import { currencySigns } from "#/currencies";
import { useTelegramLaunch } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/app/groups/$groupId/settings")({
	loader: ({ context, params }) => {
		const telegramChatId = Number(params.groupId);
		if (!Number.isNaN(telegramChatId)) {
			void context.queryClient.prefetchQuery(
				convexQuery(api.groups.getListOfExpenses, { telegramChatId }),
			);
		}
	},
	component: GroupSettingsRoute,
});

type GroupData = NonNullable<
	FunctionReturnType<typeof api.groups.getListOfExpenses>
>;

function GroupSettingsRoute() {
	const params = Route.useParams();
	const { groupId } = params;
	const telegramChatId = Number(groupId);
	const { telegramUserId } = useTelegramLaunch();
	const currentTelegramUserId = telegramUserId();

	if (Number.isNaN(telegramChatId) || currentTelegramUserId === null) {
		return <Loading />;
	}

	return (
		<GroupSettingsData
			telegramChatId={telegramChatId}
			telegramUserId={currentTelegramUserId}
		/>
	);
}

function GroupSettingsData(props: {
	telegramChatId: number;
	telegramUserId: number;
}) {
	const { data, isPending } = useQuery(api.groups.getListOfExpenses, {
		telegramChatId: props.telegramChatId,
	});

	if (isPending) return <Loading />;

	if (!data) {
		return (
			<NotFound
				text="This group is not available for settings."
				title="Group not found"
			/>
		);
	}

	return (
		<GroupSettings
			groupData={data}
			telegramChatId={props.telegramChatId}
			telegramUserId={props.telegramUserId}
		/>
	);
}

function GroupSettings(props: {
	groupData: GroupData;
	telegramChatId: number;
	telegramUserId: number;
}) {
	const navigate = useNavigate();
	const { mutate: updateGroupSettings } = useMutation({
		mutationFn: useConvexMutation(api.groups.updateGroupSettings),
	});
	const [selectedCurrency, setSelectedCurrency] = useState(
		props.groupData.defaultCurrency || "USD",
	);
	const [isSaving, setIsSaving] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const hasChanges = selectedCurrency !== props.groupData.defaultCurrency;

	useEffect(() => {
		setSelectedCurrency(
			(current) => current || props.groupData.defaultCurrency,
		);
	}, [props.groupData.defaultCurrency]);

	const handleSave = async () => {
		if (!hasChanges) return;

		setIsSaving(true);
		try {
			await updateGroupSettings({
				defaultCurrency: selectedCurrency,
				telegramChatId: props.telegramChatId,
				telegramUserId: props.telegramUserId,
			});
			setShowSuccess(true);
			window.setTimeout(() => setShowSuccess(false), 2000);
		} catch (error) {
			console.error("Failed to save settings:", error);
			alert("Failed to save settings. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 pb-20 text-gray-950 dark:bg-gray-950 dark:text-white">
			<div className="border-gray-200 border-b bg-white dark:border-gray-800 dark:bg-gray-950">
				<div className="mx-auto max-w-2xl p-4">
					<div className="mb-2 flex items-center gap-3">
						<button
							className="rounded-sm border border-gray-200 bg-white p-2 transition-colors hover:border-cyan-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-cyan-500 dark:hover:bg-gray-800"
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
							<ArrowLeft className="h-5 w-5" />
						</button>
						<h1 className="font-semibold text-2xl tracking-tight">
							Group Settings
						</h1>
					</div>
					<p className="ml-14 text-gray-500 text-sm dark:text-gray-400">
						{props.groupData.title}
					</p>
				</div>
			</div>

			<div className="mx-auto max-w-2xl space-y-4 px-4 py-4">
				<div className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<div className="mb-4 flex items-center gap-3">
						<div className="rounded-sm bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
							<Globe className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Default Currency
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								Used for new expenses in this group
							</p>
						</div>
					</div>

					<div className="relative">
						<select
							className="w-full cursor-pointer appearance-none rounded-sm border border-gray-300 bg-white px-3 py-3 text-gray-900 transition-all focus:border-cyan-600 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
							value={selectedCurrency}
							onChange={(event) =>
								setSelectedCurrency(event.currentTarget.value)
							}
						>
							{Object.entries(currencySigns).map(([code, sign]) => (
								<option value={code}>
									{code} ({sign})
								</option>
							))}
						</select>
						<div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
							<span className="text-2xl text-gray-400">
								{currencySigns[selectedCurrency] || "$"}
							</span>
						</div>
					</div>
				</div>

				<div className="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<div className="mb-4 flex items-center gap-3">
						<div className="rounded-sm bg-green-50 p-2 text-green-700 dark:bg-green-950/40 dark:text-green-300">
							<Users className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-gray-900 dark:text-white">
								Members
							</h2>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{props.groupData.members.length} member
								{props.groupData.members.length !== 1 ? "s" : ""} in this group
							</p>
						</div>
					</div>

					<div className="space-y-2">
						{props.groupData.members.map((member) => {
							const isCurrentUser =
								member.telegramUserId === props.telegramUserId;
							return (
								<div
									key={member._id}
									className={`flex items-center gap-3 rounded-sm border p-3 ${
										isCurrentUser
											? "border-cyan-200 bg-cyan-50 dark:border-cyan-900/70 dark:bg-cyan-950/30"
											: "border-gray-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-950"
									}`}
								>
									<div
										className={`flex h-10 w-10 items-center justify-center rounded-sm font-bold text-sm ${
											isCurrentUser
												? "bg-cyan-700 text-white"
												: "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
										}`}
									>
										{(
											member.firstName?.[0] ||
											member.username?.[0] ||
											"?"
										).toUpperCase()}
									</div>
									<div className="flex-1">
										<p className="font-medium text-gray-900 dark:text-white">
											{member.firstName} {member.lastName}
											{isCurrentUser ? (
												<span className="ml-2 text-cyan-700 text-xs dark:text-cyan-300">
													(You)
												</span>
											) : null}
										</p>
										{member.username ? (
											<p className="text-sm text-gray-500 dark:text-gray-400">
												@{member.username}
											</p>
										) : null}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{hasChanges ? (
				<TelegramMainButton
					ready={!isSaving && !showSuccess}
					show={!isSaving && !showSuccess}
					text={
						isSaving ? "Saving..." : showSuccess ? "Saved!" : "Save Changes"
					}
					onClick={handleSave}
				/>
			) : null}

			{showSuccess ? (
				<div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-sm bg-green-600 px-4 py-2 text-white shadow-lg">
					<Check className="h-4 w-4" />
					<span className="text-sm font-medium">Settings saved!</span>
				</div>
			) : null}
		</div>
	);
}

function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-gray-950">
			<div className="text-center">
				<LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
			</div>
		</div>
	);
}
