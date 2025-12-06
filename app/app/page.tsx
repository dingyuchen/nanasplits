"use client";

import { useLaunchParams } from "@tma.js/sdk-react";
import { Loader2 } from "lucide-react";
import { redirect, RedirectType } from "next/navigation";

export default function AppPage() {
  // Telegram SDK hooks
  const launchParams = useLaunchParams();

  const userId = launchParams?.tgWebAppData?.user?.id;
  if (!userId) {
    return <div>User not found</div>;
  }

  const startParam = launchParams?.tgWebAppStartParam ?? null;
  if (startParam !== null) {
    redirect(`/app/${userId}/group/${startParam}`, RedirectType.replace);
  }
  redirect(`/app/${userId}`, RedirectType.replace);
  // redirect(`/app/12345`, RedirectType.replace);
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex-col items-center justify-center p-6">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">Loading group...</p>
    </div>
  );
}
