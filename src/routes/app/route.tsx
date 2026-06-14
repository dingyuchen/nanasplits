import { useAuthActions } from "@convex-dev/auth/react";
import {
	createFileRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import {
	backButton,
	init,
	isTMA,
	type LaunchParams,
	mainButton,
	miniApp,
	retrieveLaunchParams,
	retrieveRawInitData,
	themeParams,
} from "@tma.js/sdk";
import { ConvexError } from "convex/values";
import { useEffect, useState } from "react";

import { TelegramMainButton } from "#/components/telegram-main-button";
import { TelegramRequiredPage } from "#/components/telegram-required";
import Loading from "#/components/ui/loading";
import { Authenticated, AuthLoading, Unauthenticated } from "#/convex-react";
import {
	TelegramLaunchParamsProvider,
	useTelegramLaunchParams,
} from "#/telegram-launch";

export const Route = createFileRoute("/app")({
	component: AppRoute,
});

type TelegramStatus = "checking" | "ready" | "unavailable";

function AppRoute() {
	const [telegramStatus, setTelegramStatus] =
		useState<TelegramStatus>("checking");
	const [launchParams, setLaunchParams] = useState<LaunchParams | null>(null);
	const [rawInitData, setRawInitData] = useState<string | undefined>(undefined);

	useEffect(() => {
		let cleanup: VoidFunction | undefined;

		void (async () => {
			try {
				const result = await isTMA("complete");
				if (!result) {
					setTelegramStatus("unavailable");
					return;
				}

				cleanup = init();
				if (!themeParams.isMounted()) {
					themeParams.mount();
				}
				if (!miniApp.isMounted()) {
					miniApp.mount();
				}
				miniApp.ready();
				setLaunchParams(retrieveLaunchParams());
				setRawInitData(retrieveRawInitData());
				setTelegramStatus("ready");
			} catch (error) {
				console.error("Failed to initialize Telegram Mini App:", error);
				setTelegramStatus("unavailable");
			}
		})();

		return () => {
			if (mainButton.isMounted()) {
				mainButton.hide();
				mainButton.unmount();
			}
			if (backButton.isMounted()) {
				backButton.hide();
				backButton.unmount();
			}
			if (miniApp.isMounted()) {
				miniApp.unmount();
			}
			if (themeParams.isMounted()) {
				themeParams.unmount();
			}
			cleanup?.();
		};
	}, []);

	if (telegramStatus === "checking") {
		return <Loading message="Checking environment..." />;
	}

	if (telegramStatus === "unavailable") {
		return <TelegramRequiredPage />;
	}

	return (
		<>
			<AuthLoading>
				<Loading message="Authenticating..." />
			</AuthLoading>
			<Unauthenticated>
				<SignInPanel initData={rawInitData} />
			</Unauthenticated>
			<Authenticated>
				<TelegramLaunchParamsProvider launchParams={() => launchParams}>
					<AppOutlet />
				</TelegramLaunchParamsProvider>
			</Authenticated>
		</>
	);
}

function SignInPanel({ initData }: { initData: string | undefined }) {
	const { signIn } = useAuthActions();
	const [msg, setMsg] = useState("Signing in...");
	useEffect(() => {
		if (!initData) {
			return;
		}

		void signIn("telegram", { initData }).catch((err) => {
			if (err instanceof ConvexError) {
				console.error("err signing in", err);
				setMsg(err.message);
			}
		});
	}, [initData, signIn]);

	return (
		<>
			<Loading message={msg} />
			<TelegramMainButton
				once
				ready={false}
				text="Close"
				onClick={() => miniApp.close()}
			/>
		</>
	);
}
function AppOutlet() {
	const location = useLocation();
	const navigate = useNavigate();
	const { launchParams, startParam } = useTelegramLaunchParams();

	useEffect(() => {
		if (location.pathname !== "/app") return;
		if (launchParams() === null) return;

		const groupId = startParam();
		if (groupId !== undefined && groupId !== "") {
			void navigate({
				params: { groupId },
				replace: true,
				to: "/app/groups/$groupId",
			});
			return;
		}
	}, [launchParams, location.pathname, navigate, startParam]);

	return <Outlet />;
}
