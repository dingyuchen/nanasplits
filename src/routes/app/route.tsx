import {
	createFileRoute,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/solid-router";
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
import {
	createEffect,
	createSignal,
	Match,
	onCleanup,
	onMount,
	Switch,
} from "solid-js";

import { TelegramMainButton } from "#/components/telegram-main-button";
import { TelegramRequiredPage } from "#/components/telegram-required";
import Loading from "#/components/ui/loading";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useAuthActions,
} from "#/solid-convex";
import { TelegramLaunchProvider, useTelegramLaunch } from "#/telegram-launch";

export const Route = createFileRoute("/app")({
	component: AppRoute,
});

type TelegramStatus = "checking" | "ready" | "unavailable";

function AppRoute() {
	const [telegramStatus, setTelegramStatus] =
		createSignal<TelegramStatus>("checking");
	const [launchParams, setLaunchParams] = createSignal<LaunchParams | null>(
		null,
	);

	onMount(() => {
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
				setTelegramStatus("ready");
			} catch (error) {
				console.error("Failed to initialize Telegram Mini App:", error);
				setTelegramStatus("unavailable");
			}
		})();

		onCleanup(() => {
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
		});
	});

	return (
		<Switch>
			<Match when={telegramStatus() === "checking"}>
				<Loading message="Checking environment..." />
			</Match>
			<Match when={telegramStatus() === "unavailable"}>
				<TelegramRequiredPage />
			</Match>
			<Match when={telegramStatus() === "ready"}>
				<AuthLoading>
					<Loading message="Authenticating..." />
				</AuthLoading>
				<Unauthenticated>
					<SignInPanel />
				</Unauthenticated>
				<Authenticated>
					<TelegramLaunchProvider launchParams={launchParams}>
						<AppOutlet />
					</TelegramLaunchProvider>
				</Authenticated>
			</Match>
		</Switch>
	);
}

function SignInPanel() {
	const { signIn } = useAuthActions();
	const [started, setStarted] = createSignal(false);

	createEffect(() => {
		if (started()) return;
		setStarted(true);
		const initData = retrieveRawInitData() ?? "";
		void signIn("telegram", { initData });
	});

	return (
		<>
			<Loading message="Signing in... Restart app if this message persists" />
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
	const { launchParams, startParam } = useTelegramLaunch();

	createEffect(() => {
		if (location().pathname !== "/app") return;
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
	});

	return <Outlet />;
}
