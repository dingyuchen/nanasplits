import type { LaunchParams } from "@tma.js/sdk";
import { type Accessor, createContext, type JSX, useContext } from "solid-js";

type TelegramLaunchContextValue = {
	launchParams: Accessor<LaunchParams | null>;
	startParam: Accessor<string | undefined>;
	telegramUserId: Accessor<number | null>;
};

const TelegramLaunchContext = createContext<TelegramLaunchContextValue>();

export function TelegramLaunchProvider(props: {
	children: JSX.Element;
	launchParams: Accessor<LaunchParams | null>;
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
	if (context === undefined) {
		throw new Error("TelegramLaunchProvider is missing from the app route.");
	}
	return context;
}
