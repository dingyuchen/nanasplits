import Link from "next/link";
import { Plus } from "lucide-react";

export function AddExpenseButton({
  telegramChatId,
  telegramUserId,
  defaultCurrency,
}: {
  telegramChatId: number;
  telegramUserId: number;
  defaultCurrency: string;
}) {
  return (
    <Link
      href={`/app/${telegramUserId}/group/${telegramChatId}/add-expense?currency=${defaultCurrency}`}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      aria-label="Add expense"
    >
      <Plus className="w-6 h-6" />
    </Link>
  );
}
