import { getPublicBaseUrl, getServerEnv } from "../src/env";

// expect https:// prefix in url
const alt = Bun.argv[2];

const host = getPublicBaseUrl() || alt;
if (!host) {
	throw new Error("Provide a public HTTPS host or set VITE_PUBLIC_BASE_URL");
}

const webhookUrl = `${host}/api/bot`;

console.log("Setting Telegram webhook:", webhookUrl);

const params = new URLSearchParams({
	url: webhookUrl,
	secret_token: getServerEnv("TELEGRAM_BOT_SECRET_TOKEN"),
});

const response = await fetch(
	`https://api.telegram.org/bot${getServerEnv("TELEGRAM_BOT_TOKEN")}/setWebhook?${params.toString()}`,
);

console.log("Response:", await response.json());
