import { api } from "@/convex/_generated/api";

import { preloadQuery } from "convex/nextjs";
import GroupMembership from "./group-membership";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import GroupView from "./group-view";

export default async function GroupPage({
  params,
  // searchParams,
}: {
  params: Promise<{ groupId: string; id: string }>;
  // searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id, groupId } = await params;
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    throw new Error("Invalid user ID");
  }
  const groupIdNumber = Number(groupId);
  if (Number.isNaN(groupIdNumber)) {
    throw new Error("Invalid group ID");
  }

  const token = await convexAuthNextjsToken();
  const preloadedGroupData = await preloadQuery(
    api.groups.getListOfExpenses,
    {
      telegramChatId: groupIdNumber,
    },
    { token },
  );

  const preloadedIsRegisteredMemberOfGroup = await preloadQuery(
    api.groups.isUserMemberOfGroup,
    {
      telegramChatId: groupIdNumber,
      telegramUserId: userId,
    },
    { token },
  );

  return (
    <GroupMembership userId={userId} groupId={groupIdNumber}>
      <GroupView
        preloadedGroupData={preloadedGroupData}
        preloadedIsRegisteredMemberOfGroup={preloadedIsRegisteredMemberOfGroup}
      />
    </GroupMembership>
  );
}
