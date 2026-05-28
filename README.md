# NanaSplits

Telegram-based expense splitting app built with Solid, TanStack Start, Convex,
Tailwind CSS, and Gramio.

## Development

Use Bun for all project commands.

```bash
bun install
bun run dev
```

Convex local development also needs:

```bash
bun run convex:dev
```

## Build

```bash
bun run build
bun run build:binary
bun run start
```

`build:binary` first creates the TanStack Start production build, then compiles
`server.ts` and the generated TanStack Start server bundle into
`dist/nanasplits` with Bun's standalone executable support. The build uses
`--compile`, `--minify`, `--sourcemap`, and `--bytecode`, and embeds
`dist/client` into the executable with Bun file imports. Bun targets the local
platform by default. The resulting binary can run without Bun, `node_modules`,
or a separate client asset directory on the VPS.

## Quality

```bash
bun run lint
bun run format
bun run check
bun x tsc --noEmit
```

## Framework Notes

- UI routes live in `src/routes` and use `@tanstack/solid-router`.
- The app shell is `src/routes/__root.tsx`.
- Solid JSX uses `class` instead of React `className`.
- Convex browser/auth bindings for Solid are wrapped in `src/solid-convex.tsx`.
- Telegram bot webhook handling lives in `src/routes/api/bot.ts`.

## VPS Deployment

Pushes to `master` deploy the production binary and restart three instances on
ports `3001`, `3002`, and `3003`. Pushes to `dev` deploy the preview binary and
restart the single instance on port `3000`. Caddy is expected to already proxy
to those ports.

The GitHub workflow builds on GitHub-hosted runners, joins the tailnet with
`tailscale/github-action`, copies the compiled binary to
`/home/hermes/nanasplits`, and restarts `systemd` units over Tailscale SSH.

### GitHub Secrets

Configure these repository secrets:

```text
TS_OAUTH_CLIENT_ID     Tailscale OAuth client ID
TS_OAUTH_SECRET        Tailscale OAuth client secret with auth_keys write scope
VPS_TAILSCALE_HOST     VPS MagicDNS name or Tailscale IP
VITE_CONVEX_URL        Convex deployment URL used at build time
```

### Tailscale

Create a Tailscale OAuth client that can create ephemeral `tag:gh-action-runner` nodes. Enable
Tailscale SSH on the VPS:

```bash
sudo tailscale set --ssh
```

The tailnet policy needs to allow `tag:gh-action-runner` to SSH to the VPS as `hermes`. A
minimal policy shape is:

```json
{
	"tagOwners": {
		"tag:gh-action-runner": ["autogroup:admin"],
		"tag:vps": ["autogroup:admin"]
	},
	"grants": [
		{
			"src": ["tag:gh-action-runner"],
			"dst": ["tag:vps"],
			"ip": ["tcp:22"]
		}
	],
	"ssh": [
		{
			"action": "accept",
			"src": ["tag:gh-action-runner"],
			"dst": ["tag:vps"],
			"users": ["hermes"]
		}
	]
}
```

Tag the VPS with `tag:vps`, or adjust the policy to match the VPS identity you
use.

### VPS Files

Create the deploy directory and install the systemd units:

```bash
sudo mkdir -p /home/hermes/nanasplits/bin
sudo chown -R hermes:hermes /home/hermes/nanasplits
sudo cp deploy/systemd/nanasplits-main@.service /etc/systemd/system/
sudo cp deploy/systemd/nanasplits-dev.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nanasplits-main@3001.service
sudo systemctl enable nanasplits-main@3002.service
sudo systemctl enable nanasplits-main@3003.service
sudo systemctl enable nanasplits-dev.service
```

Create `/home/hermes/nanasplits/main.env` and
`/home/hermes/nanasplits/dev.env`. Use different Convex or Telegram values in
`dev.env` if preview should point at separate services.

```bash
HOST=127.0.0.1
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_SECRET_TOKEN=your-telegram-webhook-secret
CONVEX_SITE_URL=https://your-convex-auth-site
PUBLIC_BASE_URL=https://your-public-app-host
ASSET_PRELOAD_MAX_SIZE=0
```

Lock the files down after editing:

```bash
chmod 600 /home/hermes/nanasplits/main.env /home/hermes/nanasplits/dev.env
```

Allow the `hermes` user to restart only these units from deploy jobs. Adjust
`/usr/bin/systemctl` if `command -v systemctl` returns a different path:

```text
hermes ALL=(root) NOPASSWD: /usr/bin/systemctl restart nanasplits-main@3001.service nanasplits-main@3002.service nanasplits-main@3003.service, /usr/bin/systemctl restart nanasplits-dev.service, /usr/bin/systemctl is-active --quiet nanasplits-main@3001.service nanasplits-main@3002.service nanasplits-main@3003.service, /usr/bin/systemctl is-active --quiet nanasplits-dev.service
```

The first successful workflow run creates these symlinks:

```text
/home/hermes/nanasplits/main -> /home/hermes/nanasplits/bin/nanasplits-main-<sha>
/home/hermes/nanasplits/dev  -> /home/hermes/nanasplits/bin/nanasplits-dev-<sha>
```
