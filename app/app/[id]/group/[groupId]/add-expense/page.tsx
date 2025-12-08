import { Suspense } from "react";
import Loading from "@/components/ui/loading";
import EditExpensePage from "./edit-expense";
import { api } from "@/convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export default async function AddExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const groupIdNumber = Number(groupId);
  const token = await convexAuthNextjsToken();
  const preloadedGroupExpenses = await preloadQuery(
    api.groups.getListOfExpenses,
    {
      telegramChatId: groupIdNumber,
    },
    { token },
  );
  return (
    <Suspense fallback={<Loading message="Loading page..." />}>
      <EditExpensePage preloadedGroupExpenses={preloadedGroupExpenses} />
    </Suspense>
  );
}
