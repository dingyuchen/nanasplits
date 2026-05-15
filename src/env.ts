export function getServerEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

export function getConvexUrl(): string {
	const value =
		import.meta.env.VITE_CONVEX_URL ??
		import.meta.env.NEXT_PUBLIC_CONVEX_URL ??
		process.env.NEXT_PUBLIC_CONVEX_URL;

	if (!value) {
		throw new Error(
			"Missing Convex URL. Set VITE_CONVEX_URL or NEXT_PUBLIC_CONVEX_URL.",
		);
	}

	return value;
}

export function getPublicBaseUrl(): string {
	return (
		process.env.VERCEL_PROJECT_PRODUCTION_URL ??
		process.env.VITE_PUBLIC_BASE_URL ??
		process.env.PUBLIC_BASE_URL ??
		""
	);
}
