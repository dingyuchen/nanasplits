import { Bot } from "gramio";
import { env } from "@/lib/env";

const bot = new Bot(env.TELEGRAM_BOT_TOKEN).on("message", (context) => {
  if (context.text) {
    return context.send(context.text);
  }
});

bot.on("my_chat_member", (context) => {
  if (
    context.oldChatMember.status === "left" &&
    context.newChatMember.status === "member"
  ) {
    return context.reply("Welcome to the group!");
  } else if (
    context.oldChatMember.status === "member" &&
    context.newChatMember.status === "left"
  ) {
    return context.reply("Goodbye!");
  }
});

await bot.init();

export const POST = async (req: Request) => {
  try {
    const update = await req.json();
    console.log(update);
    await bot.updates.handleUpdate(update);
    return new Response("Ok");
  } catch (e) {
    console.error("Error handling update", e);
    return new Response("Error", { status: 500 });
  }
};
