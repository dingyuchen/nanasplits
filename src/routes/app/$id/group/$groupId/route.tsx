import { createFileRoute, Outlet } from "@tanstack/solid-router";
import { ShieldAlert } from "lucide-solid";

import { checkTelegramMembership } from "#/telegram-membership";

export const Route = createFileRoute("/app/$id/group/$groupId")({
	loader: async ({ params }) => {
		const userId = Number(params.id);
		const chatId = Number(params.groupId);

		if (Number.isNaN(userId) || Number.isNaN(chatId)) {
			return { isMember: false, status: "invalid" };
		}

		return await checkTelegramMembership({ data: { chatId, userId } });
	},
	component: GroupLayoutRoute,
});

function GroupLayoutRoute() {
	const membership = Route.useLoaderData();

	if (!membership().isMember) {
		return <AccessDenied />;
	}

	return <Outlet />;
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
