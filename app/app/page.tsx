"use client";

import { isTMA } from "@tma.js/sdk";
import { useEffect, useState } from "react";
import TelegramApp from "./telegram-app";
import { TelegramRequiredPage } from "./telegram-required";

export default function AppPage() {
	const [isTelegram, setIsTelegram] = useState<boolean | null>(null);

	useEffect(() => {
		// Check if we're in Telegram environment
		const checkTelegram = async () => {
			try {
				const result = await isTMA("complete");
				setIsTelegram(result);
			} catch {
				setIsTelegram(false);
			}
		};

		checkTelegram();
	}, []);

	// Show loading state while checking
	if (isTelegram === null) {
		return (
			<div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
				<div className="text-center">
					<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p className="text-gray-600 dark:text-gray-400">
						Checking environment...
					</p>
				</div>
			</div>
		);
	}

	// Show error page if not in Telegram
	if (!isTelegram) {
		return <TelegramRequiredPage />;
	}

	// Only render Telegram app component when in Telegram environment
	return <TelegramApp />;
}

