import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { validate, parse } from "@tma.js/init-data-node/web";
import type { Value, GenericId } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";

/**
 * Custom Telegram provider for Convex Auth
 * Validates Telegram Mini App init data using @tma.js/init-data-node
 *
 * Based on: https://docs.telegram-mini-apps.com/platform/authorizing-user#node-js
 */
export const telegram = ConvexCredentials({
  id: "telegram",
  async authorize(
    credentials,
    ctx,
  ): Promise<{
    userId: GenericId<"users">;
    sessionId?: GenericId<"authSessions">;
  } | null> {
    // Get init data from credentials (passed from client signIn)
    const initDataRaw =
      typeof credentials.initData === "string" ? credentials.initData : null;

    if (!initDataRaw) {
      return null;
    }

    try {
      // Get bot token from environment variable
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error("TELEGRAM_BOT_TOKEN is not set");
        return null;
      }

      // Validate init data signature (valid for 1 hour)
      validate(initDataRaw, botToken, {
        expiresIn: 3600,
      });

      // Parse init data to extract user information
      const initData = parse(initDataRaw);

      // Extract user ID from init data
      const telegramUserId = initData.user?.id?.toString();
      if (!telegramUserId) {
        return null;
      }

      // Create or retrieve account using Convex Auth
      const account = await createAccount(ctx, {
        provider: "telegram",
        account: {
          id: telegramUserId,
        },
        profile: {
          telegramUserId: telegramUserId,
          firstName: initData.user?.first_name ?? "",
          lastName: initData.user?.last_name ?? "",
          username: initData.user?.username ?? "",
        },
      });

      return {
        userId: account.user._id,
      };
    } catch (error) {
      console.error("Telegram auth validation failed:", error);
      return null;
    }
  },
});
