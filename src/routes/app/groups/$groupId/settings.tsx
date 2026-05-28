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
		<div class="min-h-screen bg-slate-50 pb-20 text-gray-950 dark:bg-gray-950 dark:text-white">
			<div class="border-gray-200 border-b bg-white dark:border-gray-800 dark:bg-gray-950">
				<div class="mx-auto max-w-2xl p-4">
					<div class="mb-2 flex items-center gap-3">
						<button
							class="rounded-sm border border-gray-200 bg-white p-2 transition-colors hover:border-cyan-500 dark:border-gray-800 dark:bg-gray-900"
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
						<h1 class="font-semibold text-2xl tracking-tight">
							Group Settings
						</h1>
					</div>
					<p class="ml-14 text-gray-500 text-sm dark:text-gray-400">
						{props.groupData.title}
					</p>
				</div>
			</div>

			<div class="mx-auto max-w-2xl space-y-4 px-4 py-4">
				<div class="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-sm bg-cyan-50 p-2 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
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
							class="w-full cursor-pointer appearance-none rounded-sm border border-gray-300 bg-white px-3 py-3 text-gray-900 transition-all focus:border-cyan-600 focus:outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
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

				<div class="rounded-sm border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<div class="mb-4 flex items-center gap-3">
						<div class="rounded-sm bg-green-50 p-2 text-green-700 dark:bg-green-950/40 dark:text-green-300">
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
										class={`flex items-center gap-3 rounded-sm border p-3 ${
											isCurrentUser
												? "border-cyan-200 bg-cyan-50 dark:border-cyan-900/70 dark:bg-cyan-950/30"
												: "border-gray-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-950"
										}`}
									>
										<div
											class={`flex h-10 w-10 items-center justify-center rounded-sm font-bold text-sm ${
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
										<div class="flex-1">
											<p class="font-medium text-gray-900 dark:text-white">
												{member.firstName} {member.lastName}
												<Show when={isCurrentUser}>
													<span class="ml-2 text-cyan-700 text-xs dark:text-cyan-300">
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
				<div class="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-sm bg-green-600 px-4 py-2 text-white shadow-lg">
					<Check class="h-4 w-4" />
					<span class="text-sm font-medium">Settings saved!</span>
				</div>
			</Show>
		</div>
	);
}

function Loading() {
	return (
		<div class="flex min-h-screen items-center justify-center bg-slate-50 p-6 dark:bg-gray-950">
			<div class="text-center">
				<Loader2 class="mx-auto mb-4 h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
			</div>
		</div>
	);
}
