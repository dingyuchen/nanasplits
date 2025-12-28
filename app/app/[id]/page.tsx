import { preloadQuery } from "convex/nextjs";
import TelegramApp from "./telegram-app";
import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { Suspense } from "react";
import Loading from "@/components/ui/loading";

async function TelegramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    throw new Error("Invalid user ID");
  }
  const token = await convexAuthNextjsToken();
  const preloadedDashboard = await preloadQuery(
    api.groups.getDashboardData,
    { userId },
    { token },
  );
  return (
    <TelegramApp preloadedDashboard={preloadedDashboard} userId={userId} />
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Loading message="Getting your data..." />}>
      <TelegramPage params={params} />
    </Suspense>
  );
}
