import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { ShieldAlert } from "lucide-solid";
import { createEffect, createSignal, Show } from "solid-js";

import Loading from "#/components/ui/loading";
import { useTelegramLaunch } from "#/telegram-launch";
import { checkTelegramMembership } from "#/telegram-membership";

export const Route = createFileRoute("/app/groups/$groupId")({
	component: GroupLayoutRoute,
});

type TelegramMembership = Awaited<ReturnType<typeof checkTelegramMembership>>;

function GroupLayoutRoute() {
	const params = Route.useParams();
	const { telegramUserId } = useTelegramLaunch();
	const [membership, setMembership] = createSignal<TelegramMembership | null>(
		null,
	);
	const [isChecking, setIsChecking] = createSignal(true);

	createEffect(() => {
		const chatId = Number(params().groupId);
		const userId = telegramUserId();

		if (userId === null || Number.isNaN(chatId)) {
			setMembership({ isMember: false, status: "invalid" });
			setIsChecking(false);
			return;
		}

		setIsChecking(true);
		void checkTelegramMembership({ data: { chatId, userId } })
			.then((result) => setMembership(result))
			.catch((error) => {
				console.error("Failed to check Telegram membership:", error);
				setMembership({ isMember: false, status: "error" });
			})
			.finally(() => setIsChecking(false));
	});

	return (
		<Show
			when={!isChecking() && membership() !== null}
			fallback={<Loading message="Checking group access..." />}
		>
			<Show when={membership()?.isMember} fallback={<AccessDenied />}>
				<Outlet />
			</Show>
		</Show>
	);
}

function AccessDenied() {
	return (
		<div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 dark:from-gray-900 dark:to-gray-800">
			<div class="max-w-md text-center">
				<div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50 p-6 dark:bg-red-900/20">
					<ShieldAlert class="h-12 w-12 text-red-500 dark:text-red-400" />
				</div>
				<h1 class="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
					Access Denied
				</h1>
				<p class="mb-6 text-gray-600 dark:text-gray-400">
					You are not a member of this group. Please join the group first to
					view its expenses and details.
				</p>
			</div>
		</div>
	);
}
