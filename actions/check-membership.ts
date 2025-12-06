"use server";

import { Bot } from "gramio";
import { env } from "@/lib/env";

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

export async function checkMembership(chatId: number, userId: number) {
  // Check if user is a member using Telegram Bot API
  const chatMember = await bot.api.getChatMember({
    chat_id: chatId,
    user_id: userId,
  });

  // User is a member if status is one of these
  const validStatuses = [
    "creator",
    "administrator",
    "member",
    "restricted", // restricted users are still members
  ];

  const isMember = validStatuses.includes(chatMember.status);

  return {
    isMember,
    status: chatMember.status,
  };
}
