import Link from "next/link";
import { Plus } from "lucide-react";

export function AddExpenseButton({
  telegramChatId,
  telegramUserId,
}: {
  telegramChatId: number;
  telegramUserId: number;
}) {
  return (
    <Link
      href={`/app/${telegramUserId}/group/${telegramChatId}/add-expense`}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 focus:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
      aria-label="Add expense"
    >
      <Plus className="w-6 h-6" />
    </Link>
  );
}
