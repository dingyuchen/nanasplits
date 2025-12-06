"use client";

import { isTMA, retrieveRawInitData } from "@tma.js/sdk";
import { useEffect, useState } from "react";
import { TelegramRequiredPage } from "./telegram-required";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, useConvexAuth } from "convex/react";
import Loading from "@/components/ui/loading";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const { signIn } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    // Check if we're in Telegram environment
    const checkTelegram = async () => {
      try {
        const result = await isTMA("complete");
        setIsTelegram(result);
      } catch {
        setIsTelegram(false);
      }
    };

    checkTelegram();
  }, []);

  // Show loading state while checking environment
  if (isTelegram === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <Loading message="Checking environment..." />
      </div>
    );
  }

  // Show error page if not in Telegram
  if (!isTelegram) {
    return <TelegramRequiredPage />;
  }

  if (!isLoading && !isAuthenticated) {
    const initData = retrieveRawInitData() ?? "";
    signIn("telegram", { initData });
    // TODO: Give button to close app
    return <div>Signing in... Restart app if this message persists</div>;
  }

  return (
    <>
      <AuthLoading>
        <Loading message="Authenticating..." />
      </AuthLoading>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
