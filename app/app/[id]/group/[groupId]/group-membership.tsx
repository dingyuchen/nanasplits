import { ShieldAlert } from "lucide-react";

import { checkMembership } from "@/actions/check-membership";

export default async function GroupMembership({
  userId,
  groupId,
  children,
}: {
  userId: number;
  groupId: number;
  children: React.ReactNode;
}) {
  // Check if user is a member of this group using Telegram Bot API
  const { isMember } = await checkMembership(groupId, userId);
  if (!isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <ShieldAlert className="w-12 h-12 text-red-500 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You are not a member of this group. Please join the group first to
            view its expenses and details.
          </p>
        </div>
      </div>
    );
  }
  return children;
}
