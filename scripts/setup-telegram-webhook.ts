import { env } from "@/lib/env";

//@ts-expect-error Bun is not defined
let alt = Bun.argv[2];
if (typeof alt === "string" && alt.startsWith("https://")) {
  alt = alt.slice("https://".length).trim();
} else {
  alt = "";
}
const webhookUrl = `https://${env.VERCEL_PROJECT_PRODUCTION_URL || alt}/api/bot`;

console.log("Setting Telegram webhook:", webhookUrl);

const response = await fetch(
  `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}`,
  {
    method: "POST",
    body: JSON.stringify({
      secret_token: env.TELEGRAM_BOT_SECRET_TOKEN,
    }),
  },
);

console.log("Response:", await response.json());
