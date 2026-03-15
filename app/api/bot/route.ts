import { ConvexHttpClient } from "convex/browser";
import { Bot, blockquote, bold, format, InlineKeyboard, italic } from "gramio";
import { api } from "@/convex/_generated/api";
import { env } from "@/lib/env";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
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

const bot = new Bot(env.TELEGRAM_BOT_TOKEN).command(
  "start",
  async (context) => {
    if (context.chat.type === "private") {
      return context.send(message);
    }
    try {
      const chatId = context.chat.id;
      const chatTitle = context.chat.title || "Unnamed Group";
      const chatType = context.chat.type;
      const isForum = context.chat.isForum;
      await convex.mutation(api.groups.createOrGetGroupByChatId, {
        telegramChatId: chatId,
        title: chatTitle,
        telegramChatType: chatType,
        isForum: isForum ?? false,
      });
    } catch (error) {
      console.error("Error creating/getting group:", error);
    }
    const keyboard = new InlineKeyboard().url(
      "💰 Get Started",
      `https://t.me/${bot.info?.username}/app?startapp=${context.chat.id}`,
    );

    return context.send(message, {
      reply_markup: keyboard,
    });
  },
);

// bot.on("message", (context) => {
//   console.log("context", context);
//   return context.send(context.text ?? "");
// });

bot.on("my_chat_member", async (context) => {
  // Check if the bot was added to the group
  const isNewMember =
    (context.oldChatMember.status === "left" ||
      context.oldChatMember.status === "kicked" ||
      context.oldChatMember.status === "restricted") &&
    (context.newChatMember.status === "member" ||
      context.newChatMember.status === "administrator");

  if (isNewMember) {
    // Create or get group in Convex database
    try {
      const chatId = context.chat.id;
      const chatTitle = context.chat.title || "Unnamed Group";
      const chatType = context.chat.type;
      const isForum = context.chat.isForum;

      await convex.mutation(api.groups.createOrGetGroupByChatId, {
        telegramChatId: chatId,
        title: chatTitle,
        telegramChatType: chatType,
        isForum: isForum ?? false,
      });

      console.log(`Group created/retrieved for chat ${chatId}: ${chatTitle}`);
    } catch (error) {
      console.error("Error creating/getting group:", error);
    }

    const keyboard = new InlineKeyboard().url(
      "💰 Get Started",
      `https://t.me/${bot.info?.username}/app?startapp=${context.chat.id}`,
    );

    return context.send(message, {
      reply_markup: keyboard,
    });
  }
});

await bot.init();

export const POST = async (req: Request) => {
  console.log("req", req);
  const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
  if (secretToken !== env.TELEGRAM_BOT_SECRET_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const update = await req.json();
    await bot.updates.handleUpdate(update);
    return new Response("Ok");
  } catch (e) {
    console.error("Error handling update", e);
    return new Response("Error", { status: 500 });
  }
};
