import { preloadQuery } from "convex/nextjs";
import TelegramApp from "./telegram-app";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { auth } from "@/convex/auth";
import { getAuthUserId } from "@convex-dev/auth/server";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    throw new Error("Invalid user ID");
  }
  const token = await convexAuthNextjsToken();
  const preloaded = await preloadQuery(
    api.groups.getOverallStats,
    {
      userId: userId,
    },
    { token },
  );
  const preloadedGroupsWithPendingSplits = await preloadQuery(
    api.groups.getGroupsWithPendingSplits,
    {
      userId: userId,
    },
    { token },
  );
  return (
    <TelegramApp
      preloaded={preloaded}
      preloadedGroupsWithPendingSplits={preloadedGroupsWithPendingSplits}
    />
  );
}
