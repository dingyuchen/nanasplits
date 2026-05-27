import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import type { FunctionReturnType } from "convex/server";
import { ArrowLeft, Check, Globe, Loader2, Users } from "lucide-solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";

import { TelegramMainButton } from "#/components/telegram-main-button";
import { currencySigns } from "#/currencies";
import { useMutation, useQuery } from "#/solid-convex";
import { useTelegramLaunch } from "#/telegram-launch";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/app/groups/$groupId/settings")({
	component: GroupSettingsRoute,
});

type GroupData = NonNullable<
	FunctionReturnType<typeof api.groups.getListOfExpenses>
>;

function GroupSettingsRoute() {
	const params = Route.useParams();
	const { groupId } = params();
	const telegramChatId = Number(groupId);
	const { telegramUserId } = useTelegramLaunch();

	if (Number.isNaN(telegramChatId)) {
		return <Loading />;
	}

	return (
		<Show when={telegramUserId()} fallback={<Loading />}>
			{(currentTelegramUserId) => (
				<GroupSettingsData
					telegramChatId={telegramChatId}
					telegramUserId={currentTelegramUserId()}
				/>
			)}
		</Show>
	);
}

function GroupSettingsData(props: {
	telegramChatId: number;
	telegramUserId: number;
}) {
	const groupData = useQuery(api.groups.getListOfExpenses, {
		telegramChatId: props.telegramChatId,
	});

	return (
		<Show when={groupData()} fallback={<Loading />}>
			{(data) => (
				<GroupSettings
					groupData={data()}
					telegramChatId={props.telegramChatId}
					telegramUserId={props.telegramUserId}
				/>
			)}
		</Show>
	);
}

function GroupSettings(props: {
	groupData: GroupData;
	telegramChatId: number;
	telegramUserId: number;
}) {
	const navigate = useNavigate();
	const updateGroupSettings = useMutation(api.groups.updateGroupSettings);
	const [selectedCurrency, setSelectedCurrency] = createSignal(
		props.groupData.defaultCurrency || "USD",
	);
	const [isSaving, setIsSaving] = createSignal(false);
	const [showSuccess, setShowSuccess] = createSignal(false);
	const hasChanges = createMemo(
		() => selectedCurrency() !== props.groupData.defaultCurrency,
	);

	createEffect(() => {
		setSelectedCurrency(
			(current) => current || props.groupData.defaultCurrency,
		);
	});

	const handleSave = async () => {
		if (!hasChanges()) return;

		setIsSaving(true);
		try {
			await updateGroupSettings({
				defaultCurrency: selectedCurrency(),
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
		<div class="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-20 dark:from-gray-900 dark:to-gray-800">
			<div class="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white dark:from-blue-600 dark:to-cyan-600">
				<div class="mb-2 flex items-center gap-3">
					<button
						class="-ml-2 rounded-full p-2 transition-colors hover:bg-white/10"
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
						<ArrowLeft class="h-5 w-5" />
					</button>
					<h1 class="text-2xl font-bold">Group Settings</h1>
				</div>
				<p class="ml-8 text-sm text-blue-100">{props.groupData.title}</p>
			</div>

			<div class="space-y-6 px-4 py-6">
				<div class="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
							<Globe class="h-5 w-5" />
						</div>
						<div>
							<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
								Default Currency
							</h2>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								Used for new expenses in this group
							</p>
						</div>
					</div>

					<div class="relative">
						<select
							class="w-full cursor-pointer appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
							value={selectedCurrency()}
							onChange={(event) =>
								setSelectedCurrency(event.currentTarget.value)
							}
						>
							<For each={Object.entries(currencySigns)}>
								{([code, sign]) => (
									<option value={code}>
										{code} ({sign})
									</option>
								)}
							</For>
						</select>
						<div class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
							<span class="text-2xl text-gray-400">
								{currencySigns[selectedCurrency()] || "$"}
							</span>
						</div>
					</div>
				</div>

				<div class="rounded-2xl bg-white p-5 shadow-sm dark:bg-gray-800">
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
							<Users class="h-5 w-5" />
						</div>
						<div>
							<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
								Members
							</h2>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{props.groupData.members.length} member
								{props.groupData.members.length !== 1 ? "s" : ""} in this group
							</p>
						</div>
					</div>

					<div class="space-y-2">
						<For each={props.groupData.members}>
							{(member) => {
								const isCurrentUser =
									member.telegramUserId === props.telegramUserId;
								return (
									<div
										class={`flex items-center gap-3 rounded-xl p-3 ${
											isCurrentUser
												? "border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
												: "bg-gray-50 dark:bg-gray-700/50"
										}`}
									>
										<div
											class={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
												isCurrentUser
													? "bg-blue-500 text-white"
													: "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300"
											}`}
										>
											{(
												member.firstName?.[0] ||
												member.username?.[0] ||
												"?"
											).toUpperCase()}
										</div>
										<div class="flex-1">
											<p class="font-medium text-gray-900 dark:text-white">
												{member.firstName} {member.lastName}
												<Show when={isCurrentUser}>
													<span class="ml-2 text-xs text-blue-600 dark:text-blue-400">
														(You)
													</span>
												</Show>
											</p>
											<Show when={member.username}>
												<p class="text-sm text-gray-500 dark:text-gray-400">
													@{member.username}
												</p>
											</Show>
										</div>
									</div>
								);
							}}
						</For>
					</div>
				</div>
			</div>

			<Show when={hasChanges()}>
				<TelegramMainButton
					ready={!isSaving() && !showSuccess()}
					show={!isSaving() && !showSuccess()}
					text={
						isSaving() ? "Saving..." : showSuccess() ? "Saved!" : "Save Changes"
					}
					onClick={handleSave}
				/>
			</Show>

			<Show when={showSuccess()}>
				<div class="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-white shadow-lg">
					<Check class="h-4 w-4" />
					<span class="text-sm font-medium">Settings saved!</span>
				</div>
			</Show>
		</div>
	);
}

function Loading() {
	return (
		<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
			<div class="text-center">
				<Loader2 class="mx-auto mb-4 h-12 w-12 animate-spin text-blue-500" />
			</div>
		</div>
	);
}
