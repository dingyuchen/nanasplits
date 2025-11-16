import { AlertCircle, ExternalLink, MessageSquare } from "lucide-react";

export function TelegramRequiredPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-6">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Open in Telegram
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            NanaSplits is a Telegram Mini App and can only be accessed from
            within Telegram.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  How to open:
                </p>
                <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Open Telegram on your device</li>
                  <li>Navigate to the @nanasplits_bot</li>
                  <li>Tap the menu button to launch the app</li>
                </ol>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://telegram.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-300 hover:scale-105 shadow-lg shadow-blue-500/30"
            >
              <span>Open Telegram</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have Telegram?{" "}
            <a
              href="https://telegram.org/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Download it here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
