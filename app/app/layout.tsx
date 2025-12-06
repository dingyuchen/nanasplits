"use client";

import { isTMA, retrieveRawInitData } from "@tma.js/sdk";
import { useEffect, useState } from "react";
import { TelegramRequiredPage } from "./telegram-required";
import { Loader2 } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, useConvexAuth } from "convex/react";
import Link from "next/link";

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
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Checking environment...
          </p>
        </div>
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
    return <div>Not authenticated</div>;
  }

  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex-col items-center justify-center p-6">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Authenticating...
          </p>
        </div>
      </AuthLoading>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
