import { Bot } from "gramio";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string)
    .on("message", (context) => {
        if (context.text) {
            return context.send(context.text);
        }
    });
await bot.init();

export const POST = async (req: Request) => {
    try {
        const update = await req.json();
        await bot.updates.handleUpdate(update);
        return new Response("Ok");
    } catch (e) {
        console.error("Error handling update", e);
        return new Response("Error", { status: 500 });
    }
};

