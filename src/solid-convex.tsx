import { ConvexClient, ConvexHttpClient } from "convex/browser";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import type { Value } from "convex/values";
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { isServer } from "solid-js/web";

const VERIFIER_STORAGE_KEY = "__convexAuthOAuthVerifier";
const JWT_STORAGE_KEY = "__convexAuthJWT";
const REFRESH_TOKEN_STORAGE_KEY = "__convexAuthRefreshToken";

type Tokens = {
	token: string;
	refreshToken: string;
};

type SignInResult = {
	redirect?: string;
	verifier?: string;
	tokens?: Tokens | null;
};

type AuthActions = {
	signIn: (
		provider: string,
		params?: FormData | Record<string, Value>,
	) => Promise<{ signingIn: boolean; redirect?: URL }>;
	signOut: () => Promise<void>;
};

type SolidConvexContextValue = AuthActions & {
	client: ConvexClient;
	isAuthLoading: Accessor<boolean>;
	isAuthenticated: Accessor<boolean>;
};

const SolidConvexContext = createContext<SolidConvexContextValue>();

function storageKey(namespace: string, key: string) {
	return `${key}_${namespace.replace(/[^a-zA-Z0-9]/g, "")}`;
}

function readStorage(namespace: string, key: string) {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(storageKey(namespace, key));
}

function writeStorage(namespace: string, key: string, value: string) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(storageKey(namespace, key), value);
}

function removeStorage(namespace: string, key: string) {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(storageKey(namespace, key));
}

function paramsFromFormData(
	params: FormData | Record<string, Value> | undefined,
) {
	if (!(params instanceof FormData)) return params ?? {};

	const result: Record<string, string> = {};
	for (const [key, value] of params.entries()) {
		result[key] = String(value);
	}
	return result;
}

async function callAuthAction(
	client: ConvexClient | ConvexHttpClient,
	args: Record<string, unknown>,
) {
	return (await client.action(
		"auth:signIn" as never,
		args as never,
	)) as SignInResult;
}

export function SolidConvexProvider(props: {
	children: JSX.Element;
	convexUrl: string;
}) {
	const storageNamespace = props.convexUrl;
	const client = new ConvexClient(props.convexUrl, {
		disabled: isServer,
		expectAuth: true,
	});
	const httpClient = new ConvexHttpClient(props.convexUrl);
	const [token, setTokenSignal] = createSignal<string | null>(null);
	const [authProviderLoading, setAuthProviderLoading] = createSignal(true);
	const [isConvexAuthenticated, setIsConvexAuthenticated] = createSignal<
		boolean | null
	>(null);

	const setTokens = (tokens: Tokens | null, shouldStore: boolean) => {
		if (tokens === null) {
			setTokenSignal(null);
			if (shouldStore) {
				removeStorage(storageNamespace, JWT_STORAGE_KEY);
				removeStorage(storageNamespace, REFRESH_TOKEN_STORAGE_KEY);
			}
			return;
		}

		setTokenSignal(tokens.token);
		if (shouldStore) {
			writeStorage(storageNamespace, JWT_STORAGE_KEY, tokens.token);
			writeStorage(
				storageNamespace,
				REFRESH_TOKEN_STORAGE_KEY,
				tokens.refreshToken,
			);
		}
	};

	const refreshAccessToken = async () => {
		const refreshToken = readStorage(
			storageNamespace,
			REFRESH_TOKEN_STORAGE_KEY,
		);
		if (refreshToken === null) {
			setTokens(null, true);
			return null;
		}

		const result = await callAuthAction(httpClient, { refreshToken });
		setTokens(result.tokens ?? null, true);
		return result.tokens?.token ?? null;
	};

	const fetchAccessToken = async ({
		forceRefreshToken,
	}: {
		forceRefreshToken: boolean;
	}) => {
		if (forceRefreshToken) return await refreshAccessToken();
		return token();
	};

	const signIn: AuthActions["signIn"] = async (provider, params) => {
		const verifier =
			readStorage(storageNamespace, VERIFIER_STORAGE_KEY) ?? undefined;
		removeStorage(storageNamespace, VERIFIER_STORAGE_KEY);

		const result = await callAuthAction(client, {
			provider,
			params: paramsFromFormData(params),
			verifier,
		});

		if (result.redirect !== undefined) {
			const url = new URL(result.redirect);
			if (result.verifier !== undefined) {
				writeStorage(storageNamespace, VERIFIER_STORAGE_KEY, result.verifier);
			}
			if (navigator.product !== "ReactNative") {
				window.location.href = url.toString();
			}
			return { signingIn: false, redirect: url };
		}

		if (result.tokens !== undefined) {
			setTokens(result.tokens, true);
			return { signingIn: result.tokens !== null };
		}

		return { signingIn: false };
	};

	const signOut = async () => {
		try {
			await client.action("auth:signOut" as never, {} as never);
		} catch {
			// Signing out should still clear local credentials if the session is gone.
		}
		setTokens(null, true);
	};

	onMount(() => {
		setTokenSignal(readStorage(storageNamespace, JWT_STORAGE_KEY));
		setAuthProviderLoading(false);
	});

	createEffect(() => {
		const authenticated = token() !== null;
		const loading = authProviderLoading();

		if (loading) {
			setIsConvexAuthenticated(null);
			return;
		}

		if (authenticated) {
			client.setAuth(fetchAccessToken, (isAuthenticated) => {
				setIsConvexAuthenticated(isAuthenticated);
			});
			onCleanup(() => setIsConvexAuthenticated(null));
			return;
		}

		client.setAuth(
			async () => null,
			(isAuthenticated) => {
				setIsConvexAuthenticated(isAuthenticated);
			},
		);
		setIsConvexAuthenticated(false);
	});

	onCleanup(() => {
		void client.close();
	});

	const value: SolidConvexContextValue = {
		client,
		isAuthLoading: () => isConvexAuthenticated() === null,
		isAuthenticated: () => token() !== null && isConvexAuthenticated() === true,
		signIn,
		signOut,
	};

	return (
		<SolidConvexContext.Provider value={value}>
			{props.children}
		</SolidConvexContext.Provider>
	);
}

function useSolidConvex() {
	const context = useContext(SolidConvexContext);
	if (context === undefined) {
		throw new Error("SolidConvexProvider is missing from the component tree.");
	}
	return context;
}

export function useAuthActions() {
	const { signIn, signOut } = useSolidConvex();
	return { signIn, signOut };
}

export function AuthLoading(props: { children: JSX.Element }) {
	const auth = useSolidConvex();
	return <Show when={auth.isAuthLoading()}>{props.children}</Show>;
}

export function Authenticated(props: { children: JSX.Element }) {
	const auth = useSolidConvex();
	return <Show when={auth.isAuthenticated()}>{props.children}</Show>;
}

export function Unauthenticated(props: { children: JSX.Element }) {
	const auth = useSolidConvex();
	return (
		<Show when={!auth.isAuthLoading() && !auth.isAuthenticated()}>
			{props.children}
		</Show>
	);
}

export function useQuery<Query extends FunctionReference<"query">>(
	query: Query,
	args: FunctionArgs<Query>,
) {
	const { client } = useSolidConvex();
	const [result, setResult] = createSignal<
		FunctionReturnType<Query> | undefined
	>(undefined, { equals: false });

	createEffect(() => {
		const unsubscribe = client.onUpdate(
			query,
			args,
			(value) => setResult(() => value),
			(error) => {
				console.error("Convex query failed:", error);
			},
		);
		onCleanup(() => unsubscribe());
	});

	return result;
}

export function useMutation<Mutation extends FunctionReference<"mutation">>(
	mutation: Mutation,
) {
	const { client } = useSolidConvex();
	return async (args: FunctionArgs<Mutation>) => {
		return await client.mutation(mutation, args);
	};
}
