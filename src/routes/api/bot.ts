import { createFileRoute } from "@tanstack/react-router";
import { ConvexHttpClient } from "convex/browser";
import { Bot, blockquote, bold, format, InlineKeyboard, italic } from "gramio";
import { api } from "@/convex/_generated/api";
import { getConvexUrl, getServerEnv } from "../../env";

const message = format`
    👋 ${bold`Welcome to Nanasplits!`} 🍌
      ${italic`I'll help you split expenses easily :)`} 💰

      ${bold`How to get started:`}
      ${blockquote`
        1. Click the button below to register as a member of this expense group.
        2. Add expenses inside the app.
        3. Open the app to see the list of expenses and who owes what.
      `}

      ${bold`View summary of expenses:`}
      ${blockquote`
        You can view the summary of expenses by clicking into my profile, and clicking on ${italic`Open App`}
      `}

      ⚠️ ${bold`Note:`}
      Removing me from the group will delete all associated expenses and data.

      Made with love ❤️ and AI 🤖
      `;

let botPromise: Promise<Bot> | undefined;

async function getBot() {
	if (!botPromise) {
		botPromise = createBot();
	}
	return botPromise;
}

async function createBot() {
	const convex = new ConvexHttpClient(getConvexUrl());
	const bot = new Bot(getServerEnv("TELEGRAM_BOT_TOKEN"));

	bot.command("start", async (context) => {
		if (context.chat.type === "private") {
			return context.send(message);
		}

		await createOrGetGroup(convex, context.chat);

		const keyboard = new InlineKeyboard().url(
			"💰 Get Started",
			`https://t.me/${bot.info?.username}/app?startapp=${context.chat.id}`,
		);

		return context.send(message, { reply_markup: keyboard });
	});

	bot.on("my_chat_member", async (context) => {
		const isNewMember =
			(context.oldChatMember.status === "left" ||
				context.oldChatMember.status === "kicked" ||
				context.oldChatMember.status === "restricted") &&
			(context.newChatMember.status === "member" ||
				context.newChatMember.status === "administrator");

		if (!isNewMember) return;

		await createOrGetGroup(convex, context.chat);

		const keyboard = new InlineKeyboard().url(
			"💰 Get Started",
			`https://t.me/${bot.info?.username}/app?startapp=${context.chat.id}`,
		);

		return context.send(message, { reply_markup: keyboard });
	});

	await bot.init();
	return bot;
}

type TelegramChat = {
	id: number;
	title?: string;
	type: string;
	isForum?: boolean;
};

async function createOrGetGroup(convex: ConvexHttpClient, chat: TelegramChat) {
	try {
		await convex.mutation(api.groups.createOrGetGroupByChatId, {
			telegramChatId: chat.id,
			title: chat.title || "Unnamed Group",
			telegramChatType: chat.type,
			isForum: chat.isForum ?? false,
		});
	} catch (error) {
		console.error("Error creating/getting group:", error);
	}
}

export const Route = createFileRoute("/api/bot")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const secretToken = request.headers.get(
					"x-telegram-bot-api-secret-token",
				);
				if (secretToken !== getServerEnv("TELEGRAM_BOT_SECRET_TOKEN")) {
					return new Response("Unauthorized", { status: 401 });
				}

				try {
					const update = await request.json();
					const bot = await getBot();
					await bot.updates.handleUpdate(update);
					return new Response("Ok");
				} catch (error) {
					console.error("Error handling update", error);
					return new Response("Error", { status: 500 });
				}
			},
		},
	},
});
