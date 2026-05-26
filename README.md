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
bun run start
```

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
