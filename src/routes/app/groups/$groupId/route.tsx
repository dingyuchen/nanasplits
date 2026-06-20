import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import Loading from "#/components/ui/loading";
import { useTelegramLaunchParams } from "#/telegram-launch";
import { checkTelegramMembership } from "#/telegram-membership";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/app/groups/$groupId")({
	loader: ({ context, params }) => {
		const telegramChatId = Number(params.groupId);
		if (!Number.isNaN(telegramChatId)) {
			void context.queryClient.prefetchQuery(
				convexQuery(api.groups.getListOfExpenses, { telegramChatId }),
			);
		}
	},
	component: GroupLayoutRoute,
});

type TelegramMembership =
	| Awaited<ReturnType<typeof checkTelegramMembership>>
	| { isMember: false; status: "error" | "invalid" };

function GroupLayoutRoute() {
	const params = Route.useParams();
	const { telegramUserId } = useTelegramLaunchParams();
	const [membership, setMembership] = useState<TelegramMembership | null>(null);
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		const chatId = Number(params.groupId);
		const userId = telegramUserId();

		if (userId === null || Number.isNaN(chatId)) {
			setMembership({ isMember: false, status: "invalid" });
			setIsChecking(false);
			return;
		}

		setIsChecking(true);
		void checkTelegramMembership({ data: { chatId, userId } })
			.then((result) => {
				setMembership(result);
			})
			.catch((error) => {
				console.error("Failed to check Telegram membership:", error);
				setMembership({ isMember: false, status: "error" });
			})
			.finally(() => {
				setIsChecking(false);
			});
	}, [params.groupId, telegramUserId]);

	if (isChecking || membership === null) {
		return <Loading message="Checking group access..." />;
	}

	if (!membership.isMember) {
		return <AccessDenied />;
	}

	return <Outlet />;
}

function AccessDenied() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-stone-50 p-6 text-stone-900">
			<div className="max-w-md text-center">
				<div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-red-50 p-3">
					<ShieldAlert className="h-8 w-8 text-red-600" />
				</div>
				<h1 className="font-serif font-medium tracking-tight mb-3 text-3xl text-stone-900">
					Access Denied
				</h1>
				<p className="mb-6 text-stone-500">
					You are not a member of this group. Please join the group first to
					view its expenses and details.
				</p>
			</div>
		</div>
	);
}
