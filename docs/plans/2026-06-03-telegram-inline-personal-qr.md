# Telegram Inline Personal QR Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Let a NanaSplits user type `@<bot> qr` from any Telegram chat and send a personal NanaSplits QR share card that links recipients to that user’s NanaSplits profile/setup flow.

**Architecture:** Enable Telegram inline mode at BotFather, add a GramIO inline-query handler in `src/routes/api/bot.ts`, and answer `qr`/empty inline queries with a personal `InlineQueryResultArticle`. The inline result is personal-cached, built from the querying Telegram user ID, and contains a public opaque-token URL for a QR/share page plus an inline keyboard button. The Mini App dashboard ensures the signed-in user has an opaque share token; unauthenticated inline users get a setup button that opens the Mini App/private chat.

**Tech Stack:** Telegram Bot API inline mode, GramIO `bot.inlineQuery`, Convex schema/functions, TanStack React Start API routes, React, Bun, optional `qrcode` package via `bun add qrcode` if we render QR images server-side.

---

## Research notes

- Telegram inline mode is enabled in BotFather with `/setinline`; users invoke the bot by typing the bot username and a query in any chat. Telegram sends an `InlineQuery` update containing `id`, `from`, `query` up to 256 chars, optional `chat_type`, and optional `offset`.
- Bots answer with `answerInlineQuery`; Telegram allows at most 50 results. Use `is_personal: true` when the result depends on the requesting user, otherwise Telegram may reuse a cached answer for another user with the same query.
- `cache_time` defaults to 300 seconds; use `cache_time: 0` while developing, then a small value such as 30-60 seconds for personal QR results.
- `InlineQueryResultsButton` can either open a Web App or send a `start_parameter` to the private chat. This is useful for setup if the inline user has not opened NanaSplits yet.
- `InlineQueryResultArticle` is the best MVP result type because it sends text/input message content and can carry an inline keyboard. `InlineQueryResultPhoto` requires the photo URL to be a public JPEG <= 5 MB; avoid this for MVP unless we add JPEG QR rendering.
- Telegram Mini Apps can call `web_app_switch_inline_query` / SDK equivalent to insert the bot username plus query into a selected chat; this is the right “Share my QR” UX from inside the Mini App.
- GramIO supports `bot.inlineQuery(pattern, handler)` and `context.answer([...], { cache_time, is_personal })`. GramIO also provides `InlineQueryResult.article(...)`, `InputMessageContent.text(...)`, and `InlineKeyboard().switchToChosenChat(...)` patterns.

## Product decision for MVP

Build a **share card** first, not a raw QR photo:

- Inline query: `@NanaSplitsBot qr` or empty query shows one result: “Share my NanaSplits QR”.
- Sent message text: “Scan/open this NanaSplits QR to connect with <name>.” plus a public URL.
- Button: “Open QR” linking to `https://<host>/qr/<token>`.
- QR page: renders the actual personal QR code for the token URL, with copy/open affordances.
- Future enhancement: add `InlineQueryResultPhoto` once we have stable public JPEG QR generation.

This avoids Telegram’s JPEG-only photo-result constraint and keeps the personal token private from the visible message except as an opaque URL.

---

## Task 1: Add personal share token fields to Convex schema

**Objective:** Store an opaque per-user token that can be safely embedded in public QR/share URLs.

**Files:**

- Modify: `convex/schema.ts`

**Steps:**

1. Add optional fields to `users`:
   - `personalShareToken: v.optional(v.string())`
   - `personalShareTokenCreatedAt: v.optional(v.number())`
2. Add an index:
   - `.index("by_personal_share_token", ["personalShareToken"])`
3. Keep existing `by_telegram_user_id` index.

**Verification:**

- Run `bun x tsc --noEmit` after generated Convex types are refreshed.

**Commit:**

```bash
git add convex/schema.ts
git commit -m "feat: add personal share token schema"
```

---

## Task 2: Create token helpers

**Objective:** Centralize token generation and URL/message formatting so bot, API routes, and UI stay consistent.

**Files:**

- Create: `src/lib/personal-share.ts`
- Create: `src/lib/personal-share.test.ts`

**Implementation sketch:**

```ts
export function createPersonalShareToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return btoa(String.fromCharCode(...bytes))
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

export function buildPersonalQrUrl(baseUrl: string, token: string) {
	return `https://${baseUrl.replace(/^https?:\/\//, "")}/qr/${encodeURIComponent(token)}`;
}

export function displayUserName(user: {
	firstName?: string;
	lastName?: string;
	username?: string;
}) {
	return (
		[user.firstName, user.lastName].filter(Boolean).join(" ") ||
		(user.username ? `@${user.username}` : "this NanaSplits user")
	);
}
```

**Tests:**

- Token only contains URL-safe characters and is long enough.
- URL builder strips accidental `https://` from `VITE_PUBLIC_BASE_URL`.
- Display name prefers first+last, then username, then fallback.

**Commands:**

```bash
bun test src/lib/personal-share.test.ts
```

**Commit:**

```bash
git add src/lib/personal-share.ts src/lib/personal-share.test.ts
git commit -m "feat: add personal share helpers"
```

---

## Task 3: Add protected Convex mutation to ensure the current user has a token

**Objective:** Generate the token only in an authenticated Mini App session, avoiding a public mutation that can mint tokens for arbitrary Telegram IDs.

**Files:**

- Modify: `convex/groups.ts` or create `convex/personalShare.ts` if keeping share functions separate.

**Implementation sketch:**

```ts
export const ensurePersonalShareToken = protectedMutation({
	args: { telegramUserId: v.number() },
	handler: async (ctx, args) => {
		const user = await ctx.db.get(ctx.userId);
		if (!user || user.telegramUserId !== args.telegramUserId) {
			throw new Error("User mismatch");
		}
		if (user.personalShareToken) return user.personalShareToken;

		const token = createConvexSafeToken();
		await ctx.db.patch(ctx.userId, {
			personalShareToken: token,
			personalShareTokenCreatedAt: Date.now(),
		});
		return token;
	},
});
```

**Note:** Convex functions cannot import browser-only helpers if they use `crypto.getRandomValues`; use `Math.random` is not ideal. Prefer a small server-safe helper using `crypto.randomUUID()` if Convex runtime supports it, or build from `Date.now()` + random and check for collisions by querying `by_personal_share_token` before patching.

**Verification:**

- Run `bun x tsc --noEmit`.
- Confirm generated API exposes `api.groups.ensurePersonalShareToken` or `api.personalShare.ensurePersonalShareToken`.

**Commit:**

```bash
git add convex/groups.ts
git commit -m "feat: ensure personal share tokens"
```

---

## Task 4: Add public Convex query for bot inline results

**Objective:** Let the webhook handler fetch only public share-card data by Telegram user ID.

**Files:**

- Modify: `convex/groups.ts` or `convex/personalShare.ts`

**Implementation sketch:**

```ts
export const getPersonalShareByTelegramUserId = query({
	args: { telegramUserId: v.number() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_telegram_user_id", (q) =>
				q.eq("telegramUserId", args.telegramUserId),
			)
			.first();

		if (!user?.personalShareToken) return null;
		return {
			firstName: user.firstName,
			lastName: user.lastName,
			username: user.username,
			personalShareToken: user.personalShareToken,
		};
	},
});
```

**Security rule:** Do not return balances, groups, Convex IDs, or Telegram user IDs from this public query.

**Verification:**

- Run `bun x tsc --noEmit`.

**Commit:**

```bash
git add convex/groups.ts convex/_generated
git commit -m "feat: expose public personal share lookup"
```

---

## Task 5: Ensure token from the dashboard

**Objective:** Existing signed-in users get a token before trying inline mode.

**Files:**

- Modify: `src/routes/app/index.tsx`

**Steps:**

1. Import `useEffect` and `useMutation`.
2. In `Dashboard({ userId })`, call `ensurePersonalShareToken({ telegramUserId: userId })` once when `userId` exists.
3. Keep this non-blocking; dashboard should still render if token creation fails, but log the error.

**Implementation sketch:**

```tsx
const ensurePersonalShareToken = useMutation(
	api.groups.ensurePersonalShareToken,
);
useEffect(() => {
	void ensurePersonalShareToken({ telegramUserId: userId }).catch((error) =>
		console.error("Failed to ensure personal share token", error),
	);
}, [ensurePersonalShareToken, userId]);
```

**Verification:**

- Run `bun x tsc --noEmit`.
- Open `/app` in Telegram dev flow and confirm no UI regression.

**Commit:**

```bash
git add src/routes/app/index.tsx
git commit -m "feat: prepare personal share token on dashboard"
```

---

## Task 6: Add QR/share page route

**Objective:** Provide a public URL that renders the personal QR code and can be linked from inline messages.

**Files:**

- Create: `src/routes/qr/$token.tsx`
- Optional dependency: `qrcode` via `bun add qrcode` if rendering QR in the page with generated SVG/data URL.

**MVP approach:**

- Render a simple public page at `/qr/$token`.
- The page displays a QR code encoding its own absolute URL.
- If client-side QR rendering is used, dynamically import `qrcode` and render an SVG/data URL after mount.
- Include fallback text/link so the page still works if QR rendering fails.

**Validation:**

- Token must match `/^[A-Za-z0-9_-]{16,64}$/`; invalid tokens render a friendly “Invalid QR link” state.
- If desired, add a public Convex lookup by token to show the user’s display name; otherwise keep the page static to avoid leaking more user data.

**Verification:**

```bash
bun x tsc --noEmit
bun run build:dev
```

**Commit:**

```bash
git add src/routes/qr/$token.tsx package.json bun.lock
git commit -m "feat: add personal QR page"
```

---

## Task 7: Add GramIO inline-query handler

**Objective:** Return a personal QR share-card result for inline mode.

**Files:**

- Modify: `src/routes/api/bot.ts`

**Implementation sketch:**

```ts
import { InlineKeyboard, InlineQueryResult, InputMessageContent } from "gramio";
import { buildPersonalQrUrl, displayUserName } from "#/lib/personal-share";

bot.inlineQuery(/^(qr)?$/i, async (context) => {
	const share = await convex.query(
		api.groups.getPersonalShareByTelegramUserId,
		{
			telegramUserId: context.from.id,
		},
	);

	if (!share) {
		return context.answer([], {
			cache_time: 0,
			is_personal: true,
			button: {
				text: "Open NanaSplits to enable your QR",
				start_parameter: "qr_setup",
			},
		});
	}

	const qrUrl = buildPersonalQrUrl(
		getServerEnv("VITE_PUBLIC_BASE_URL"),
		share.personalShareToken,
	);
	const name = displayUserName(share);

	return context.answer(
		[
			InlineQueryResult.article(
				`personal-qr-${share.personalShareToken}`,
				"Share my NanaSplits QR",
				InputMessageContent.text(
					`🍌 NanaSplits QR for ${name}\n\nOpen or scan: ${qrUrl}`,
				),
				{
					description: `Send ${name}'s NanaSplits QR link`,
					reply_markup: new InlineKeyboard().url("Open QR", qrUrl),
				},
			),
		],
		{ cache_time: 30, is_personal: true },
	);
});
```

**Notes:**

- Check exact GramIO imports/types against current installed version; if `InlineQueryResult` or `InputMessageContent` names differ, use GramIO’s generated API reference.
- Add a broader fallback query handler only if GramIO allows handler ordering without shadowing future inline commands.

**Verification:**

```bash
bun x tsc --noEmit
bun run build:dev
```

**Commit:**

```bash
git add src/routes/api/bot.ts
git commit -m "feat: answer personal QR inline queries"
```

---

## Task 8: Add Mini App “Share QR” affordance

**Objective:** Let users launch inline sharing from inside NanaSplits without remembering `@bot qr`.

**Files:**

- Modify: `src/routes/app/index.tsx`
- Possibly create: `src/components/share-personal-qr-button.tsx`

**Approach:**

1. Add a compact “Share my QR” button near the dashboard header or balances card.
2. On click, call Telegram Mini App `web_app_switch_inline_query` through `@tma.js/sdk` if available:
   - query: `qr`
   - chat types: users and groups for personal QR sharing.
3. If unsupported, copy/show `@<bot> qr` instructions.

**Verification:**

- In Telegram, tap the button and confirm Telegram prompts to choose a chat and inserts `@<bot> qr`.
- In web/dev fallback, confirm the button does not crash.

**Commit:**

```bash
git add src/routes/app/index.tsx src/components/share-personal-qr-button.tsx
git commit -m "feat: add personal QR share button"
```

---

## Task 9: BotFather and webhook rollout checklist

**Objective:** Enable inline mode and test in Telegram.

**Steps:**

1. In BotFather:
   - Run `/setinline` for the NanaSplits bot.
   - Placeholder suggestion: `qr — share your NanaSplits QR`.
   - Optional later: `/setinlinefeedback` if we want `chosen_inline_result` analytics.
2. Redeploy the app/bot webhook.
3. Verify webhook secret remains configured through `bun run set:webhook` if host changed.
4. Test as a user who has opened `/app`:
   - Type `@<bot> qr` in Saved Messages.
   - See exactly one result.
   - Tap result.
   - Open the `Open QR` button.
5. Test as a user without token:
   - Type `@<bot> qr`.
   - See setup button instead of leaked/default data.

**Commit:**

```bash
git status
```

No code commit required for BotFather settings.

---

## Task 10: Quality gates

**Objective:** Ensure the feature is safe and Bun-compatible before merging.

**Commands:**

```bash
bun test
bun run check
bun x tsc --noEmit
bun run build:dev
```

**Manual acceptance criteria:**

- `@<bot> qr` returns a personal result only for the querying Telegram user.
- `answerInlineQuery` uses `is_personal: true`.
- Inline result IDs are stable and <= 64 bytes.
- Public Convex query returns only display name + token.
- QR route rejects malformed tokens.
- Mini App share button gracefully falls back outside Telegram.
- No npm commands are used; use Bun for dependency/install/test/build steps.

**Commit:**

```bash
git status
git log --oneline -n 10
```

---

## Future enhancements

- Add `InlineQueryResultPhoto` by generating public JPEG QR images, if sending the QR as image media is important.
- Add `chosen_inline_result` tracking after enabling BotFather inline feedback.
- Add token rotation/revocation from settings.
- Add per-group QR mode later: `@<bot> group <chat>` for inviting group members into a NanaSplits group.
