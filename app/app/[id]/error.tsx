"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
          You are not authorized to access this page
        </h1>
        <Button onClick={reset}>Reset</Button>
      </div>
    </div>
  );
}
