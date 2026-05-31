# NanaSplits

Telegram-based expense splitting app built with Solid, TanStack Start, Convex,
Tailwind CSS, and Gramio.

## Roadmap

- [ ] protect group creation with a http endpoint
- [ ] encrypt .env variables
- [ ] notification in group
- [ ] backfill amount to int
- [ ] migrate convexdb region to eu west
- [ ] overhaul UI
- [ ] add rate limiter
- [ ] bot inline mode
- [ ] delete transaction on removal

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

Pushes to `master` deploy the production binary for three instances on ports
`3001`, `3002`, and `3003`. Pushes to `dev` deploy the preview binary for the
single instance on port `3000`. Caddy is expected to already proxy to those
ports.

The GitHub workflow builds on GitHub-hosted runners, joins the tailnet with
`tailscale/github-action`, copies the compiled binary to
`/home/hermes/nanasplits/bin`, and atomically replaces the stable symlink for
the target environment. Root-owned `systemd` path units on the VPS watch those
stable symlinks with `PathMoved=` and restart the app services locally.

### GitHub Secrets

Configure these repository secrets:

```text
TS_OAUTH_CLIENT_ID     Tailscale OAuth client ID
TS_OAUTH_SECRET        Tailscale OAuth client secret with auth_keys write scope
VPS_TAILSCALE_HOST     VPS MagicDNS name or Tailscale IP
```

Configure these repository variables:

```text
VITE_CONVEX_URL        Public Convex deployment URL used at build time
VITE_PUBLIC_BASE_URL   Public app host used at build time, without https://
```

### Tailscale

Create a Tailscale OAuth client that can create ephemeral `tag:gh-action-runner` nodes. Enable
Tailscale SSH on the VPS.

The tailnet policy needs to allow `tag:gh-action-runner` to SSH to the VPS as `hermes`. A
minimal policy shape is:

```json
{
	"tagOwners": {
		"tag:gh-action-runner": ["autogroup:admin"],
		"tag:vps": ["autogroup:admin"]
	},
	"ssh": [
		{
			"src": ["autogroup:member"],
			"dst": ["autogroup:self", "tag:vps"], // allow any user to ssh into vps; required to access your vps after tagging
			"users": ["autogroup:nonroot", "root"],
			"action": "check"
		},
		{
			"src": ["tag:gh-action-runner"],
			"dst": ["tag:vps"],
			"users": ["autogroup:nonroot"],
			"action": "accept"
		}
	]
}
```

Tag the VPS with `tag:vps`, or adjust the policy to match the VPS identity you
use.

### VPS Files

For app-owned files, SSH to the VPS as `hermes`:

```bash
ssh hermes@<vps-tailscale-host>
mkdir -p ~/nanasplits/bin
```

For first-time setup, install the files in `deploy/systemd` as system units.
Enable the long-running app services and the deploy watcher path units; the
`*-restart.service` units are one-shot helpers triggered by the path units and
do not need to be enabled. Run these commands in a privileged shell on the VPS,
from this repo checkout:

```bash
sudo cp deploy/systemd/*.service deploy/systemd/*.path /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nanasplits-master@3001.service nanasplits-master@3002.service nanasplits-master@3003.service
sudo systemctl enable nanasplits-dev.service
sudo systemctl enable --now nanasplits-master-deploy.path nanasplits-dev-deploy.path
```

The services run the app as `hermes` and the path units watch
`/home/hermes/nanasplits/master` and `/home/hermes/nanasplits/dev`. Those
stable paths are symlinks to immutable release binaries under
`/home/hermes/nanasplits/bin`; deployments update them with an atomic symlink
swap so the path units can trigger the restart helpers.

Create `~/nanasplits/master.env` and `~/nanasplits/dev.env`. Use different
Convex or Telegram values in `dev.env` if preview should point at separate
services.

```bash
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_SECRET_TOKEN=your-telegram-webhook-secret
VITE_CONVEX_SITE_URL=https://your-convex-auth-site
```

Lock the files down after editing:

```bash
chmod 600 ~/nanasplits/master.env ~/nanasplits/dev.env
```

The first successful workflow run creates these stable symlinks:

```text
/home/hermes/nanasplits/master
/home/hermes/nanasplits/dev
```
