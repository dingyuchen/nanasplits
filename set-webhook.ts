import { env } from "@/env";

const cloudflare_tunnel_url = prompt("tunnel url:");
const host_url = `${cloudflare_tunnel_url}/api/bot`;
const response = await fetch(
  `https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook?url=${host_url}&drop_pending_updates=True`,
);
if (!response.ok) {
  throw new Error(`Response status: ${response.status}`);
}
console.log(await response.json());