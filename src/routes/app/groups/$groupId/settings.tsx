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
import { useTelegramLaunchParams } from "#/telegram-launch";
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
	const { telegramUserId } = useTelegramLaunchParams();
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
		<div className="min-h-screen bg-stone-50 pb-20 text-stone-900">
			<div className="mx-auto my-8 max-w-[430px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm max-[480px]:my-0 max-[480px]:min-h-screen max-[480px]:rounded-none max-[480px]:border-0">
				<header className="border-stone-100 border-b px-5 py-4">
					<div className="flex items-center gap-3">
						<button
							className="flex h-8 w-8 items-center justify-center rounded-md text-stone-500 transition hover:bg-stone-100"
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
						<h1 className="font-heading text-stone-900 text-2xl">
							Group Settings
						</h1>
					</div>
					<p className="ml-11 mt-1 text-stone-500 text-sm">
						{props.groupData.title}
					</p>
				</header>

				<div className="space-y-4 p-5">
					<div className="rounded-lg border border-stone-200 bg-white p-4">
						<div className="mb-4 flex items-center gap-3">
							<div className="rounded-lg bg-sky-50 p-2 text-sky-500">
								<Globe className="h-5 w-5" />
							</div>
							<div>
								<h2 className="font-heading text-stone-900 text-xl">
									Default Currency
								</h2>
								<p className="text-stone-500 text-sm">
									Used for new expenses in this group
								</p>
							</div>
						</div>

						<div className="relative">
							<select
								className="w-full cursor-pointer appearance-none rounded-lg border border-stone-200 bg-white px-3 py-3 text-stone-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10"
								value={selectedCurrency}
								onChange={(event) =>
									setSelectedCurrency(event.currentTarget.value)
								}
							>
								{Object.entries(currencySigns).map(([code, sign]) => (
									<option key={code} value={code}>
										{code} ({sign})
									</option>
								))}
							</select>
							<div className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">
								<span className="text-2xl text-stone-400">
									{currencySigns[selectedCurrency] || "$"}
								</span>
							</div>
						</div>
					</div>

					<div className="rounded-lg border border-stone-200 bg-white p-4">
						<div className="mb-4 flex items-center gap-3">
							<div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
								<Users className="h-5 w-5" />
							</div>
							<div>
								<h2 className="font-heading text-stone-900 text-xl">Members</h2>
								<p className="text-stone-500 text-sm">
									{props.groupData.members.length} member
									{props.groupData.members.length !== 1 ? "s" : ""} in this
									group
								</p>
							</div>
						</div>

						<div>
							{props.groupData.members.map((member) => {
								const isCurrentUser =
									member.telegramUserId === props.telegramUserId;
								return (
									<div
										key={member._id}
										className={`flex items-center gap-3 border-stone-100 border-b px-1 py-3 last:border-b-0 ${
											isCurrentUser
												? "rounded-lg border border-sky-100 bg-sky-50 px-3"
												: ""
										}`}
									>
										<div
											className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white font-bold text-sm ${
												isCurrentUser
													? "bg-sky-500 text-white"
													: "bg-stone-300 text-stone-500"
											}`}
										>
											{(
												member.firstName?.[0] ||
												member.username?.[0] ||
												"?"
											).toUpperCase()}
										</div>
										<div className="flex-1">
											<p className="font-medium text-stone-900">
												{member.firstName} {member.lastName}
												{isCurrentUser ? (
													<span className="ml-2 text-sky-500 text-xs">
														(You)
													</span>
												) : null}
											</p>
											{member.username ? (
												<p className="text-stone-500 text-sm">
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
				<div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-lg">
					<Check className="h-4 w-4" />
					<span className="text-sm font-medium">Settings saved!</span>
				</div>
			) : null}
		</div>
	);
}

function Loading() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-stone-50 p-6">
			<div className="text-center">
				<LoaderCircle className="mx-auto mb-4 h-8 w-8 animate-spin text-sky-500" />
			</div>
		</div>
	);
}
