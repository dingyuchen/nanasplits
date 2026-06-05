import type { LaunchParams } from "@tma.js/sdk";
import { createContext, type ReactNode, useContext } from "react";

type TelegramLaunchContextValue = {
	launchParams: () => LaunchParams | null;
	startParam: () => string | undefined;
	telegramUserId: () => number | null;
};

const TelegramLaunchContext = createContext<TelegramLaunchContextValue | null>(
	null,
);

export function TelegramLaunchProvider(props: {
	children: ReactNode;
	launchParams: () => LaunchParams | null;
}) {
	const value: TelegramLaunchContextValue = {
		launchParams: props.launchParams,
		startParam: () =>
			props.launchParams()?.tgWebAppStartParam ??
			props.launchParams()?.tgWebAppData?.start_param,
		telegramUserId: () => props.launchParams()?.tgWebAppData?.user?.id ?? null,
	};

	return (
		<TelegramLaunchContext.Provider value={value}>
			{props.children}
		</TelegramLaunchContext.Provider>
	);
}

export function useTelegramLaunch() {
	const context = useContext(TelegramLaunchContext);
	if (context === null) {
		throw new Error("TelegramLaunchProvider is missing from the app route.");
	}
	return context;
}
