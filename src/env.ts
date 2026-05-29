export function getServerEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function getConvexUrl(): string {
	const value = import.meta.env.VITE_CONVEX_URL;

	if (!value) {
		throw new Error("Missing Convex URL. Set VITE_CONVEX_URL.");
	}

	return value;
}

export function getPublicBaseUrl(): string {
	return import.meta.env.VITE_PUBLIC_BASE_URL ?? "";
}
