import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { validate, parse } from "@tma.js/init-data-node/web";
import { type Value, type GenericId, ConvexError } from "convex/values";
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
      throw new ConvexError("Init data is not supplied");
    }

    try {
      // Get bot token from environment variable
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.error("TELEGRAM_BOT_TOKEN is not set");
        return null;
      }

      // Validate init data signature (valid for 1 hour)
      console.log("signing in");
      await validate(initDataRaw, botToken, {
        expiresIn: 60 * 60, // 1 hour
      });

      // Parse init data to extract user information
      const initData = parse(initDataRaw);

      // Extract user ID from init data
      const telegramUserId = initData.user?.id;
      if (!telegramUserId) {
        throw new ConvexError("Telegram user ID is not found");
      }

      // Create or retrieve account using Convex Auth
      const { account, user } = await createAccount(ctx, {
        provider: "telegram",
        account: {
          id: telegramUserId.toString(),
        },
        profile: {
          telegramUserId: telegramUserId,
          firstName: initData.user?.first_name as string,
          lastName: initData.user?.last_name as string,
          username: initData.user?.username as string,
        },
      });

      return {
        userId: user._id,
      };
    } catch (error) {
      console.error("Telegram auth validation failed:", error);
      throw new ConvexError("Telegram auth validation failed");
    }
  },
});
