import { convexAuth } from "@convex-dev/auth/server";
import { telegram } from "./telegramProvider";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [telegram],
});
