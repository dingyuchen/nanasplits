"use client";

import { useLaunchParams } from "@tma.js/sdk-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loading from "@/components/ui/loading";

export default function AppPage() {
  const router = useRouter();
  const launchParams = useLaunchParams();
  useEffect(() => {
    const userId = launchParams?.tgWebAppData?.user?.id;
    const startParam = launchParams?.tgWebAppStartParam ?? null;
    if (startParam !== null) {
      router.replace(`/app/${userId}/group/${startParam}`);
    } else {
      router.replace(`/app/${userId}`);
    }
  }, [launchParams, router]);

  const userId = launchParams?.tgWebAppData?.user?.id;
  if (!userId) {
    return <div>User not found</div>;
  }
  const groupId = launchParams?.tgWebAppStartParam;
  router.prefetch(`/app/${userId}${groupId ? `/group/${groupId}` : ""}`);
  return <Loading />;
}
