"use client";

import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinGroupButton({
  telegramChatId,
  telegramUserId,
}: {
  telegramChatId: number;
  telegramUserId: number;
}) {
  const addUserToGroup = useMutation(api.groups.addUserToGroup);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleJoinGroup = async () => {
    setIsLoading(true);
    try {
      await addUserToGroup({
        telegramChatId,
        telegramUserId,
      });
      // Refresh the page to show the updated membership status
      router.refresh();
    } catch (error) {
      console.error("Failed to join group:", error);
      alert("Failed to join group. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <Button
        onClick={handleJoinGroup}
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Joining...
          </>
        ) : (
          <>
            <UserPlus className="w-5 h-5" />
            Join Group
          </>
        )}
      </Button>
    </div>
  );
}

