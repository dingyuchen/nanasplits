# AGENTS.md - NanaSplits Development Guide

## Project Overview

NanaSplits is a Telegram Mini App for splitting group expenses. It is built with:

- **Runtime/package manager**: Bun
- **Frontend**: TanStack React Start, TanStack React Router, React, Vite
- **Backend**: Convex with `@convex-dev/auth`
- **Styling**: Tailwind CSS 4 via `@tailwindcss/vite`
- **Data fetching**: `@tanstack/react-query` with `@convex-dev/react-query`
- **Icons**: `lucide-react`
- **Telegram**: `@tma.js/sdk`, `@tma.js/init-data-node`, Gramio
- **Validation**: Zod on client/server inputs, Convex validators on backend functions

The app is primarily meant to run inside Telegram. The public `/` route is a small web landing page; `/app` initializes Telegram Mini App APIs, signs in with Telegram init data, and routes users to the dashboard or a Telegram group.

---

## Commands

Use Bun for project commands.

### Development

```bash
bun install
bun run dev              # Start TanStack/Vite dev server on port 3000
bun run convex:dev       # Start Convex dev server; run alongside the app
```

### Build and Serve

```bash
bun run build            # Build production app with Vite --mode production
bun run build:dev        # Build preview/dev app with Vite --mode dev
bun run start            # Serve dist through server.ts
bun run preview          # Vite preview
```

### Quality

```bash
bun run lint             # Run Oxlint
bun run format           # Format with Oxfmt
bun run check            # Run lint and oxfmt --check
bun x tsc --noEmit       # Type-check; there is no package script for this
```

### Convex and Telegram

```bash
bun run convex:deploy    # Deploy Convex backend
bun run set:webhook      # Set Telegram webhook using configured public host
bun run set:webhook https://example.com
```

`set:webhook` uses `VITE_PUBLIC_BASE_URL` when present. The optional CLI argument may include `https://`; the script strips it before building `https://<host>/api/bot`.

---

## Environment

Required for local app/backend work:

- `VITE_CONVEX_URL`: public Convex URL used by the React client and bot route at build time.
- `VITE_PUBLIC_BASE_URL`: public app host used at build time and by `set:webhook`.
- `TELEGRAM_BOT_TOKEN`: used by Gramio, Telegram Mini App auth validation, and membership checks.
- `TELEGRAM_BOT_SECRET_TOKEN`: validates incoming Telegram webhook requests and is sent by `set:webhook`.
- `VITE_CONVEX_SITE_URL`: Convex Auth issuer domain in `convex/auth.config.ts`.

Useful deployment/server env vars:

- `PORT` and `HOST`: production server bind settings for `server.ts`.
- `ASSET_PRELOAD_*`: optional static asset preload/cache/gzip controls in `server.ts`.

---

## Code Style Guidelines

### General Principles

1. Prefer explicit types and imports.
2. Keep route components and UI helpers focused; extract repeated UI into `src/components`.
3. Use TypeScript strictly. Avoid `any`; use Convex `Id<"table">` and `Doc<"table">` for documents.
4. Handle async errors with `try`/`catch`, log the original error, and show a short user-facing message.
5. Preserve existing mobile-first Telegram Mini App patterns.

### Imports and Aliases

Oxfmt sorts imports. Keep the current alias conventions:

- Use `#/*` for files under `src/*`.
- Use `@/*` for repo-root imports such as `@/convex/_generated/api`, `@/convex/_generated/dataModel`, and `@/lib/utils`.
- Use explicit type imports: `import type { Id } from "...";`
- Do not edit generated files in `src/routeTree.gen.ts` or `convex/_generated/*` by hand.

Example:

```typescript
import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { FunctionReturnType } from "convex/server";
import { LoaderCircle } from "lucide-react";

import Loading from "#/components/ui/loading";
import { useQuery } from "#/convex-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
```

### Types and Naming

- Use `type` for object shapes, unions, and aliases.
- Use `interface` for component props when extending JSX/native element props.
- Components are PascalCase.
- Functions, hooks, and state variables are camelCase.
- Prefer kebab-case for new `src` component/helper files. Keep existing route, Convex, and generated filenames as they are.
- Constants are UPPER_SNAKE_CASE only for true configuration constants.

### React and TanStack Start

- Routes live in `src/routes` and use TanStack Router file-based routing.
- React JSX uses `className`, not `class`.
- Prefer `useState`, `useEffect`, plain derived values, and standard JSX conditionals/maps.
- React Compiler is enabled in `vite.config.ts`; do not add `useMemo` just for routine derived values. Add memoization only when there is a measured need and React Compiler cannot cover it.
- Do not add Solid-style compatibility components such as `Show`, `For`, `Switch`, or `Match`; write inline React conditionals and array `.map()` calls.
- Use `createServerFn` for server-side route helpers, as in `src/telegram-membership.ts`.
- App providers are wired through `src/routes/__root.tsx` and `src/providers.tsx`.
- Telegram app state is initialized in `src/routes/app/route.tsx` and exposed through `src/telegram-launch.tsx`.
- Convex browser/auth bindings are wrapped in `src/convex-react.tsx`.
- Convex route loader prefetches should use non-blocking `void context.queryClient.prefetchQuery(convexQuery(...))` so route rendering is not blocked. Components should still render their loading states.
- Use `TelegramMainButton` for Telegram main-button actions instead of in-page primary buttons when the flow expects the native Telegram control.

Current route shape:

```text
src/routes/
├── __root.tsx
├── index.tsx
├── api/bot.ts
└── app/
    ├── route.tsx
    ├── index.tsx
    └── groups/$groupId/
        ├── route.tsx
        ├── index.tsx
        ├── add-expense.tsx
        └── settings.tsx
```

### Styling

- Tailwind CSS is imported from `src/styles.css`.
- Keep mobile-first layouts; this app is designed for Telegram on phones.
- Use existing color conventions: blue/cyan app chrome, green for positive balances, red for negative/destructive states, gray surfaces for neutral UI.
- Use dark mode variants consistently.
- Existing UI commonly uses `rounded-2xl` cards, `rounded-xl` inputs/list rows, and `rounded-full` icon/avatar/native-action affordances.
- Shared class merging lives in `lib/utils.ts` as `cn()`.

### Convex Backend

Before editing Convex code, read `convex/_generated/ai/guidelines.md`.

Current backend files:

- `convex/schema.ts`: schema, auth tables, users, groups, group membership, expenses, and `ExpenseType`.
- `convex/groups.ts`: group creation, dashboard data, membership checks, expenses, settlements, and group settings.
- `convex/auth.ts`: Convex Auth setup with the custom Telegram provider.
- `convex/telegramProvider.ts`: validates Telegram init data and creates/links Convex Auth users.
- `convex/lib/utils.ts`: `protectedQuery` and `protectedMutation` wrappers using `getAuthUserId`.
- `convex/http.ts`: mounts Convex Auth HTTP routes.

Backend rules:

- Use `protectedQuery` and `protectedMutation` for authenticated public operations.
- Always include Convex argument validators.
- Never trust client-passed IDs for authorization. Derive the authenticated user with Convex Auth and verify Telegram user/group membership server-side.
- For group expense writes, reuse or extend the shared participant validation pattern in `getGroupWithParticipantValidation`.
- Keep queries index-backed where possible. Add indexes in `convex/schema.ts` before introducing new query shapes.
- Amounts are stored as numbers. Expense `items` contain exact split amounts per user.
- Multi-currency balances are calculated per currency; do not collapse currencies into a single total.

### Telegram Integration

- `/api/bot` is the Telegram webhook endpoint implemented as a TanStack Start API route.
- Webhook requests must include `x-telegram-bot-api-secret-token` matching `TELEGRAM_BOT_SECRET_TOKEN`.
- The Gramio bot creates or retrieves a Convex group when it receives `/start` in a group or when the bot is added to a group.
- Telegram Mini App auth uses raw init data from `@tma.js/sdk`, passed to `signIn("telegram", { initData })`.
- Group pages verify Telegram chat membership through `checkTelegramMembership` before rendering group content.

---

## File Organization

```text
nanasplits/
├── src/
│   ├── routes/                  # TanStack Start file routes and API route
│   ├── components/              # Telegram and shared UI components
│   │   └── ui/                  # Button, loading, currency input
│   ├── providers.tsx            # App provider wiring
│   ├── convex-react.tsx         # React Convex auth/query/mutation wrappers
│   ├── react-accessor-state.ts  # Small state helper for form-heavy screens
│   ├── telegram-launch.tsx      # Telegram launch params context
│   ├── telegram-membership.ts   # Server function for group membership checks
│   ├── currencies.tsx           # Currency metadata/options
│   ├── env.ts                   # Environment helpers
│   ├── router.tsx               # Router factory
│   ├── routeTree.gen.ts         # Generated TanStack route tree
│   └── styles.css               # Tailwind entry
├── convex/
│   ├── schema.ts
│   ├── groups.ts
│   ├── auth.ts
│   ├── auth.config.ts
│   ├── telegramProvider.ts
│   ├── http.ts
│   ├── session.ts
│   ├── lib/utils.ts
│   └── _generated/              # Generated Convex files
├── lib/utils.ts                 # Shared cn() helper
├── scripts/setup-telegram-webhook.ts
├── server.ts                    # Bun production server
├── vite.config.ts
├── package.json
└── AGENTS.md
```

---

## Testing

There is no committed test suite and no `test` package script. Vitest, jsdom, and Testing Library DOM are installed, so prefer Vitest for new tests unless the project adopts another runner.

When adding tests:

- Put focused tests near the code they cover.
- For Convex functions, follow the generated Convex testing guidance in `convex/_generated/ai/guidelines.md`.
- Add or document a runnable test command if you introduce the first test suite.

---

## Notes

- `src/routeTree.gen.ts` is generated by TanStack Router tooling.
- `convex/_generated/*` is generated by Convex.
- Do not revert user changes unless explicitly asked.
- Keep all user-facing money behavior multi-currency aware.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
