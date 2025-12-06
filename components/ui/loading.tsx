import { Loader2 } from "lucide-react";

export default function Loading({ message }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex-col items-center justify-center p-6">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto m-4" />
      <p className="text-gray-600 dark:text-gray-400 text-center">
        {message ?? "Loading..."}
      </p>
    </div>
  );
}
