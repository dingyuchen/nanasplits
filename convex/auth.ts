import { convexAuth } from "@convex-dev/auth/server";
import { telegram } from "./telegramProvider";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [telegram],
  jwt: {
    durationMs: 60 * 60 * 1000, // 1 hour
  },
  session: {
    totalDurationMs: 60 * 60 * 1000, // 1 hour
    inactiveDurationMs: 60 * 60 * 1000, // 1 hour
  },
});
