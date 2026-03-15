import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { Suspense } from "react";
import Loading from "@/components/ui/loading";
import { api } from "@/convex/_generated/api";
import GroupSettings from "./group-settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string; groupId: string }>;
}) {
  const { id, groupId } = await params;
  const telegramUserId = Number(id);
  const groupIdNumber = Number(groupId);
  const token = await convexAuthNextjsToken();

  const preloadedGroupData = await preloadQuery(
    api.groups.getListOfExpenses,
    {
      telegramChatId: groupIdNumber,
    },
    { token },
  );

  return (
    <Suspense fallback={<Loading message="Loading settings..." />}>
      <GroupSettings
        preloadedGroupData={preloadedGroupData}
        telegramUserId={telegramUserId}
        telegramChatId={groupIdNumber}
      />
    </Suspense>
  );
}
