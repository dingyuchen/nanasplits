"use client";

import {
  backButton,
  init,
  isTMA,
  mainButton,
  retrieveRawInitData,
  themeParams,
  miniApp,
} from "@tma.js/sdk";
import { useEffect, useState } from "react";
import { TelegramRequiredPage } from "./telegram-required";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, useConvexAuth } from "convex/react";
import Loading from "@/components/ui/loading";
import MainButton from "./[id]/main-button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isTelegram, setIsTelegram] = useState<boolean | null>(null);
  const { signIn } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    // Check if we're in Telegram environment
    const checkTelegram = async () => {
      try {
        const result = await isTMA("complete");
        if (result) {
          // Initialize TMA.js SDK
          init();
          if (!themeParams.isMounted()) {
            themeParams.mount();
          }
        }
        setIsTelegram(result);
      } catch {
        setIsTelegram(false);
      }
    };

    checkTelegram();
    return () => {
      if (mainButton.isMounted()) {
        mainButton.hide();
        mainButton.unmount();
      }
      if (backButton.isMounted()) {
        backButton.hide();
        backButton.unmount();
      }
      if (themeParams.isMounted()) {
        themeParams.unmount();
      }
    };
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
    return (
      <>
        <Loading message="Signing in... Restart app if this message persists" />
        <MainButton text="Close" onClick={() => miniApp.close()} once />
      </>
    );
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
