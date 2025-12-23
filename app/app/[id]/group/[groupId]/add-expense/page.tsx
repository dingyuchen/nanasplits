import { Suspense } from "react";
import Loading from "@/components/ui/loading";
import EditExpensePage from "./edit-expense";
import { api } from "@/convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export default async function AddExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { groupId } = await params;
  const resolvedSearchParams = await searchParams;
  const groupIdNumber = Number(groupId);
  const token = await convexAuthNextjsToken();
  const preloadedGroupExpenses = await preloadQuery(
    api.groups.getListOfExpenses,
    {
      telegramChatId: groupIdNumber,
    },
    { token },
  );

  // Extract search params for the edit expense page
  const expenseId = (resolvedSearchParams.expenseId as string) || null;
  const description = (resolvedSearchParams.description as string) || "";
  const currency = (resolvedSearchParams.currency as string) || null;
  const payerId = (resolvedSearchParams.payerId as string) || null;
  const date = (resolvedSearchParams.date as string) || null;
  const items = (resolvedSearchParams.items as string) || null;

  return (
    <Suspense fallback={<Loading message="Loading page..." />}>
      <EditExpensePage
        preloadedGroupExpenses={preloadedGroupExpenses}
        searchParams={{
          expenseId,
          description,
          currency,
          payerId,
          date,
          items,
        }}
      />
    </Suspense>
  );
}
