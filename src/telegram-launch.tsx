import type { LaunchParams } from "@tma.js/sdk";
import { createContext, type ReactNode, useContext } from "react";

type TelegramLaunchParamsContextValue = {
	launchParams: () => LaunchParams | null;
	startParam: () => string | undefined;
	telegramUserId: () => number | null;
};

const TelegramLaunchParamsContext =
	createContext<TelegramLaunchParamsContextValue | null>(null);

export function TelegramLaunchParamsProvider(props: {
	children: ReactNode;
	launchParams: () => LaunchParams | null;
}) {
	const value: TelegramLaunchParamsContextValue = {
		launchParams: props.launchParams,
		startParam: () =>
			props.launchParams()?.tgWebAppStartParam ??
			props.launchParams()?.tgWebAppData?.start_param,
		telegramUserId: () => props.launchParams()?.tgWebAppData?.user?.id ?? null,
	};

	return (
		<TelegramLaunchParamsContext.Provider value={value}>
			{props.children}
		</TelegramLaunchParamsContext.Provider>
	);
}

export function useTelegramLaunchParams() {
	const context = useContext(TelegramLaunchParamsContext);
	if (context === null) {
		throw new Error(
			"TelegramLaunchParamsProvider is missing from the app route.",
		);
	}
	return context;
}
