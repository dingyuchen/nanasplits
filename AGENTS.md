# AGENTS.md - Nanasplits Development Guide

## Project Overview

Nanasplits is a Telegram-based expense splitting app built with:

- **Frontend**: TanStack Start, TanStack Router, SolidJS, Vite
- **Backend**: Convex (serverless database + API)
- **Styling**: Tailwind CSS 4 with `@tailwindcss/vite`
- **Icons**: lucide-solid
- **Telegram**: `@tma.js/sdk`, Gramio bot framework
- **Validation**: Zod

---

## Commands

### Development

```bash
bun run dev              # Start development server
bun run convex:dev      # Start Convex dev server (required for local development)
```

### Building

```bash
bun run build           # Build production app
bun run start           # Start production server
```

### Linting & Formatting

```bash
bun run lint            # Run Oxlint
bun run format         # Format code with Oxfmt
```

### Database

```bash
bun run convex:deploy   # Deploy Convex backend to production
```

---

## Code Style Guidelines

### General Principles

1. **Prefer explicit over implicit** - Be clear about types and imports
2. **Keep components small and focused** - Extract logic into separate components/files
3. **Use TypeScript properly** - Avoid `any`, use proper type annotations
4. **Handle errors explicitly** - Use try/catch with user-friendly error messages

### Imports

Organize imports in the following order (Oxfmt will enforce this):

1. External libraries (Solid, TanStack, etc.)
2. Internal packages (Convex, etc.)
3. Absolute imports (`@/...`)
4. Relative imports (`./`, `../`)

```typescript
// Good
import { createSignal } from "solid-js";
import { ArrowLeftRight } from "lucide-solid";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "../solid-convex";
import { TelegramMainButton } from "../../telegram-main-button";
import { SettleUp } from "./settle-up";

// Avoid - don't mix import styles
import { api } from "@/convex/_generated/api";
import { createSignal } from "solid-js";
```

### Types

- Use `type` for object shapes, unions, and primitives
- Use `interface` for component props
- Always import types explicitly: `import type { Id } from "..."`
- Use Convex's `Id<"tableName">` for document IDs

```typescript
// Good
type MemberBalance = {
	memberId: Id<"users">;
	memberName: string;
	balance: number;
};

interface SettleUpProps {
	currencyBalances: CurrencyBalances;
	currentUserId: Id<"users">;
}

// Bad
const memberId: any = "...";
```

### Naming Conventions

- **Components**: PascalCase (e.g., `GroupView`, `SettleUp`)
- **Functions**: camelCase (e.g., `handleSettle`, `calculateBalance`)
- **Types/Interfaces**: PascalCase (e.g., `MemberBalance`, `CurrencyData`)
- **Files**: kebab-case (e.g., `group-view.tsx`, `settle-up.tsx`)
- **Constants**: UPPER_SNAKE_CASE for config values, camelCase otherwise

### Solid/TanStack Patterns

- Routes live in `src/routes` and use TanStack Router file-based routing
- Solid JSX uses `class` instead of React `className`
- Use `createSignal`, `createMemo`, `createEffect`, `Show`, and `For` for reactive UI
- Extract complex UI/logic into separate components
- Do not use React hooks or Next.js APIs

```typescript
// Good - extract to separate component
export function SettleUp({ ... }: SettleUpProps) {
  const mutation = useMutation(api.groups.settleUp);
  // ...
}
```

### Convex Backend

- Use `protectedMutation` and `protectedQuery` for authenticated operations
- Always validate user membership in groups before operations
- Use the validation helper pattern for shared validation logic

```typescript
// Good - validate with helper
const { group, memberIds } = await getGroupWithParticipantValidation(
	ctx.db,
	{ telegramChatId, telegramUserId, payerId, items },
	ctx.userId,
);

// Bad - duplicate validation logic in each mutation
```

### Error Handling

- Use try/catch for async operations
- Show user-friendly alerts/messages for errors
- Log errors to console for debugging

```typescript
// Good
try {
  await mutation({ ... });
} catch (error) {
  console.error("Failed to settle:", error);
  alert("Failed to settle. Please try again.");
}
```

### Tailwind CSS

- Use dark mode variants: `dark:bg-gray-800`, `dark:text-white`
- Follow existing color patterns (green for positive, red for negative)
- Use existing border/shadow patterns from the codebase
- Use `rounded-2xl` for cards, `rounded-full` for buttons/avatars

```typescript
// Good - consistent with codebase
class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5"
class="bg-green-50 dark:bg-green-900/20 text-green-600"

// Bad - inconsistent
class="bg-gray-100 rounded-lg shadow-md"
```

### Database Schema (Convex)

- Define schemas in `convex/schema.ts`
- Use proper indexes for query performance
- Document relationships in comments

---

## File Organization

```
nanasplits/
├── src/                    # TanStack Start app
│   ├── routes/             # File-based TanStack routes
│   │   ├── app.$id.tsx
│   │   ├── app.$id.group.$groupId.index.tsx
│   │   ├── app.$id.group.$groupId.add-expense.tsx
│   │   └── api/bot.ts
│   ├── solid-convex.tsx    # Solid Convex auth/query wrappers
│   └── styles.css
├── convex/                # Convex backend
│   ├── groups.ts          # Group-related mutations/queries
│   ├── schema.ts          # Database schema
│   └── lib/               # Utilities
├── components/           # Shared UI components
│   └── ui/               # Reusable UI (Button, Input, etc.)
└── AGENTS.md            # This file
```

---

## Testing

This project does not currently have a test suite. If adding tests:

- Use the same testing framework as the team agrees on
- Place tests alongside components (`ComponentName.test.tsx`)
- Run specific tests with appropriate tooling

---

## Notes

- This is a Telegram Mini App - the UI is designed for mobile within Telegram
- The app uses Telegram authentication via `@tma.js/sdk`
- All monetary amounts are stored as numbers (not strings)
- Multi-currency support is built into the balance calculation

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
