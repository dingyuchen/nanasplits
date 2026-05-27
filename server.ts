import path from "node:path";

const SERVER_PORT = Number(process.env.PORT ?? 3000);
const SERVER_HOST = process.env.HOST ?? "::";
const CLIENT_DIRECTORY = "./dist/client";
const SERVER_ENTRY_POINT = "./dist/server/server.js";

const MAX_PRELOAD_BYTES = Number(
	process.env.ASSET_PRELOAD_MAX_SIZE ?? 5 * 1024 * 1024,
);
const VERBOSE = process.env.ASSET_PRELOAD_VERBOSE_LOGGING === "true";
const ENABLE_ETAG =
	(process.env.ASSET_PRELOAD_ENABLE_ETAG ?? "true") === "true";
const ENABLE_GZIP =
	(process.env.ASSET_PRELOAD_ENABLE_GZIP ?? "true") === "true";
const GZIP_MIN_BYTES = Number(process.env.ASSET_PRELOAD_GZIP_MIN_SIZE ?? 1024);
const GZIP_TYPES = (
	process.env.ASSET_PRELOAD_GZIP_MIME_TYPES ??
	"text/,application/javascript,application/json,application/xml,image/svg+xml"
)
	.split(",")
	.map((value) => value.trim())
	.filter(Boolean);

const INCLUDE_PATTERNS = parseGlobPatterns(
	process.env.ASSET_PRELOAD_INCLUDE_PATTERNS,
);
const EXCLUDE_PATTERNS = parseGlobPatterns(
	process.env.ASSET_PRELOAD_EXCLUDE_PATTERNS,
);

type StartHandler = {
	fetch: (request: Request) => Response | Promise<Response>;
};

type StaticRouteHandler = (request: Request) => Response | Promise<Response>;

type AssetMetadata = {
	route: string;
	size: number;
	type: string;
};

type InMemoryAsset = {
	raw: Uint8Array<ArrayBuffer>;
	gzip?: Uint8Array<ArrayBuffer>;
	etag?: string;
	type: string;
	cacheControl: string;
};

type StaticRouteResult = {
	routes: Record<string, StaticRouteHandler>;
	loaded: AssetMetadata[];
	skipped: AssetMetadata[];
};

const log = {
	info: (message: string) => console.log(`[INFO] ${message}`),
	success: (message: string) => console.log(`[SUCCESS] ${message}`),
	warning: (message: string) => console.warn(`[WARNING] ${message}`),
	error: (message: string) => console.error(`[ERROR] ${message}`),
	header: (message: string) => console.log(`\n${message}\n`),
};

function parseGlobPatterns(value: string | undefined): RegExp[] {
	return (value ?? "")
		.split(",")
		.map((pattern) => pattern.trim())
		.filter(Boolean)
		.map(convertGlobToRegExp);
}

function convertGlobToRegExp(globPattern: string): RegExp {
	const escapedPattern = globPattern
		.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&")
		.replace(/\*/g, ".*");

	return new RegExp(`^${escapedPattern}$`, "i");
}

function isFileEligibleForPreloading(relativePath: string): boolean {
	const fileName = relativePath.split(/[/\\]/).pop() ?? relativePath;

	if (
		INCLUDE_PATTERNS.length > 0 &&
		!INCLUDE_PATTERNS.some((pattern) => pattern.test(fileName))
	) {
		return false;
	}

	return !EXCLUDE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function isMimeTypeCompressible(mimeType: string): boolean {
	return GZIP_TYPES.some((type) =>
		type.endsWith("/") ? mimeType.startsWith(type) : mimeType === type,
	);
}

function compressDataIfAppropriate(
	data: Uint8Array<ArrayBuffer>,
	mimeType: string,
): Uint8Array<ArrayBuffer> | undefined {
	if (!ENABLE_GZIP) return undefined;
	if (data.byteLength < GZIP_MIN_BYTES) return undefined;
	if (!isMimeTypeCompressible(mimeType)) return undefined;

	try {
		return Bun.gzipSync(data);
	} catch {
		return undefined;
	}
}

function computeEtag(data: Uint8Array<ArrayBuffer>): string {
	const hash = Bun.hash(data);
	return `W/"${hash.toString(16)}-${data.byteLength.toString()}"`;
}

function getCacheControl(route: string): string {
	if (route.startsWith("/assets/")) {
		return "public, max-age=31536000, immutable";
	}

	return "public, max-age=3600";
}

function createResponseHandler(asset: InMemoryAsset): StaticRouteHandler {
	return (request) => {
		const acceptsGzip = request.headers
			.get("accept-encoding")
			?.includes("gzip");
		const useGzip = Boolean(ENABLE_GZIP && asset.gzip && acceptsGzip);
		const body = useGzip && asset.gzip ? asset.gzip : asset.raw;

		const headers: Record<string, string> = {
			"Cache-Control": asset.cacheControl,
			"Content-Length": String(body.byteLength),
			"Content-Type": asset.type,
		};

		if (asset.gzip) {
			headers.Vary = "Accept-Encoding";
		}

		if (useGzip) {
			headers["Content-Encoding"] = "gzip";
		}

		if (ENABLE_ETAG && asset.etag) {
			if (request.headers.get("if-none-match") === asset.etag) {
				return new Response(null, {
					headers: {
						"Cache-Control": asset.cacheControl,
						ETag: asset.etag,
					},
					status: 304,
				});
			}

			headers.ETag = asset.etag;
		}

		return new Response(
			request.method === "HEAD" ? null : new Uint8Array(body),
			{ headers },
		);
	};
}

function createOnDemandHandler(
	filepath: string,
	metadata: AssetMetadata,
): StaticRouteHandler {
	return async (request) => {
		const file = Bun.file(filepath);

		if (!(await file.exists())) {
			return new Response("Not Found", { status: 404 });
		}

		return new Response(request.method === "HEAD" ? null : file, {
			headers: {
				"Cache-Control": getCacheControl(metadata.route),
				"Content-Length": String(file.size),
				"Content-Type": metadata.type,
			},
		});
	};
}

async function initializeStaticRoutes(
	clientDirectory: string,
): Promise<StaticRouteResult> {
	const routes: Record<string, StaticRouteHandler> = {};
	const loaded: AssetMetadata[] = [];
	const skipped: AssetMetadata[] = [];
	let totalPreloadedBytes = 0;

	log.info(`Loading static assets from ${clientDirectory}`);

	if (VERBOSE) {
		log.info(
			`Preload limit: ${(MAX_PRELOAD_BYTES / 1024 / 1024).toFixed(2)} MB`,
		);
	}

	try {
		const glob = new Bun.Glob("**/*");

		for await (const relativePath of glob.scan({ cwd: clientDirectory })) {
			const filepath = path.join(clientDirectory, relativePath);
			const route = `/${relativePath.split(path.sep).join(path.posix.sep)}`;
			const file = Bun.file(filepath);

			if (!(await file.exists()) || file.size === 0) {
				continue;
			}

			const metadata: AssetMetadata = {
				route,
				size: file.size,
				type: file.type || "application/octet-stream",
			};
			const shouldPreload =
				file.size <= MAX_PRELOAD_BYTES &&
				isFileEligibleForPreloading(relativePath);

			if (shouldPreload) {
				const bytes = new Uint8Array(await file.arrayBuffer());
				const asset: InMemoryAsset = {
					raw: bytes,
					gzip: compressDataIfAppropriate(bytes, metadata.type),
					etag: ENABLE_ETAG ? computeEtag(bytes) : undefined,
					type: metadata.type,
					cacheControl: getCacheControl(route),
				};

				routes[route] = createResponseHandler(asset);
				loaded.push({ ...metadata, size: bytes.byteLength });
				totalPreloadedBytes += bytes.byteLength;
				continue;
			}

			routes[route] = createOnDemandHandler(filepath, metadata);
			skipped.push(metadata);
		}
	} catch (error) {
		log.error(`Failed to load static assets: ${String(error)}`);
	}

	if (loaded.length > 0) {
		log.success(
			`Preloaded ${loaded.length.toString()} files (${(totalPreloadedBytes / 1024 / 1024).toFixed(2)} MB)`,
		);
	} else {
		log.warning("No static files were preloaded");
	}

	if (skipped.length > 0) {
		log.info(`${skipped.length.toString()} files will be served on demand`);
	}

	if (VERBOSE) {
		for (const file of [...loaded, ...skipped].sort((left, right) =>
			left.route.localeCompare(right.route),
		)) {
			const status = loaded.some(
				(loadedFile) => loadedFile.route === file.route,
			)
				? "memory"
				: "on-demand";
			log.info(`${status.padEnd(9)} ${file.route} ${file.type}`);
		}
	}

	return { routes, loaded, skipped };
}

async function loadStartHandler(): Promise<StartHandler> {
	const serverModule = (await import(SERVER_ENTRY_POINT)) as {
		default?: StartHandler;
		fetch?: StartHandler["fetch"];
	};
	const handler =
		serverModule.default ??
		(serverModule.fetch ? { fetch: serverModule.fetch } : undefined);

	if (!handler || typeof handler.fetch !== "function") {
		throw new Error(`Missing fetch handler in ${SERVER_ENTRY_POINT}`);
	}

	return handler;
}

async function initializeServer() {
	log.header("Starting TanStack Start Bun server");

	let handler: StartHandler;

	try {
		handler = await loadStartHandler();
		log.success("TanStack Start handler initialized");
	} catch (error) {
		log.error(`Failed to load server handler: ${String(error)}`);
		process.exit(1);
	}

	const { routes } = await initializeStaticRoutes(CLIENT_DIRECTORY);
	const server = Bun.serve({
		hostname: SERVER_HOST,
		port: SERVER_PORT,
		routes: {
			...routes,
			"/*": async (request) => {
				try {
					return await handler.fetch(request);
				} catch (error) {
					log.error(`Server handler error: ${String(error)}`);
					return new Response("Internal Server Error", { status: 500 });
				}
			},
		},
		error(error) {
			log.error(`Uncaught server error: ${String(error)}`);
			return new Response("Internal Server Error", { status: 500 });
		},
	});

	const displayHost =
		SERVER_HOST === "::" || SERVER_HOST === "0.0.0.0"
			? "localhost"
			: SERVER_HOST;
	log.success(
		`Server listening on http://${displayHost}:${(server.port ?? SERVER_PORT).toString()}`,
	);
}

initializeServer().catch((error: unknown) => {
	log.error(`Failed to start server: ${String(error)}`);
	process.exit(1);
});
