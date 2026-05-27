import { createServerFn } from "@tanstack/solid-start";
import { Bot } from "gramio";
import { z } from "zod";

import { getServerEnv } from "./env";

const membershipInput = z.object({
	chatId: z.number(),
	userId: z.number(),
});

const validTelegramMemberStatuses = new Set([
	"creator",
	"administrator",
	"member",
	"restricted",
]);

export const checkTelegramMembership = createServerFn({ method: "GET" })
	.inputValidator(membershipInput)
	.handler(async ({ data }) => {
		const bot = new Bot(getServerEnv("TELEGRAM_BOT_TOKEN"));
		const chatMember = await bot.api.getChatMember({
			chat_id: data.chatId,
			user_id: data.userId,
		});

		return {
			isMember: validTelegramMemberStatuses.has(chatMember.status),
			status: chatMember.status,
		};
	});
