import { Suspense } from "react";
import Loading from "@/components/ui/loading";
import GroupSettings from "./group-settings";
import { api } from "@/convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

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
