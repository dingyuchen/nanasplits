import path from "node:path";

const CLIENT_DIRECTORY = "dist/client";
const SERVER_ENTRY_POINT = "dist/server/server.js";
const GENERATED_DIRECTORY = ".deploy";
const GENERATED_ENTRY_POINT = path.join(
	GENERATED_DIRECTORY,
	"standalone-entry.ts",
);
const OUTPUT_FILE = process.env.STANDALONE_OUTFILE ?? "dist/nanasplits";
const SUPPORTED_COMPILE_TARGETS = [
	"bun-darwin-arm64",
	"bun-darwin-x64",
	"bun-darwin-x64-baseline",
	"bun-linux-arm64",
	"bun-linux-arm64-musl",
	"bun-linux-x64",
	"bun-linux-x64-baseline",
	"bun-linux-x64-modern",
	"bun-linux-x64-musl",
	"bun-windows-arm64",
	"bun-windows-x64",
	"bun-windows-x64-baseline",
	"bun-windows-x64-modern",
] as const;

type CompileTarget = (typeof SUPPORTED_COMPILE_TARGETS)[number];

type ClientAsset = {
	importName: string;
	route: string;
	type: string;
	sourcePath: string;
};

function getCompileTarget(): CompileTarget {
	const target = process.env.BUN_COMPILE_TARGET ?? "bun-linux-x64";

	if (SUPPORTED_COMPILE_TARGETS.includes(target as CompileTarget)) {
		return target as CompileTarget;
	}

	throw new Error(`Unsupported Bun compile target: ${target}`);
}

async function pathExists(filepath: string): Promise<boolean> {
	return Bun.file(filepath).exists();
}

function toPosixPath(filepath: string): string {
	return filepath.split(path.sep).join(path.posix.sep);
}

function toImportSpecifier(filepath: string): string {
	const relativePath = path.relative(GENERATED_DIRECTORY, filepath);
	const posixPath = toPosixPath(relativePath);

	return posixPath.startsWith(".") ? posixPath : `./${posixPath}`;
}

async function getClientAssets(): Promise<ClientAsset[]> {
	const glob = new Bun.Glob("**/*");
	const assets: ClientAsset[] = [];
	let assetIndex = 0;

	for await (const relativePath of glob.scan({ cwd: CLIENT_DIRECTORY })) {
		const sourcePath = path.join(CLIENT_DIRECTORY, relativePath);
		const file = Bun.file(sourcePath);

		if (!(await file.exists()) || file.size === 0) {
			continue;
		}

		assets.push({
			importName: `asset${assetIndex.toString()}`,
			route: `/${toPosixPath(relativePath)}`,
			sourcePath,
			type: file.type || "application/octet-stream",
		});
		assetIndex += 1;
	}

	return assets.sort((left, right) => left.route.localeCompare(right.route));
}

function generateStandaloneEntry(assets: ClientAsset[]): string {
	const serverImport = toImportSpecifier(SERVER_ENTRY_POINT);
	const assetImports = assets
		.map(
			(asset) =>
				`import ${asset.importName} from ${JSON.stringify(toImportSpecifier(asset.sourcePath))} with { type: "file" };`,
		)
		.join("\n");
	const assetManifest = assets
		.map(
			(asset) =>
				`\t{ path: ${asset.importName}, route: ${JSON.stringify(asset.route)}, type: ${JSON.stringify(asset.type)} },`,
		)
		.join("\n");

	return `${assetImports}
import * as serverModule from ${JSON.stringify(serverImport)};

const SERVER_PORT = Number(process.env.PORT ?? 3000);
const SERVER_HOST = process.env.HOST ?? "127.0.0.1";

type StartHandler = {
\tfetch: (request: Request) => Response | Promise<Response>;
};

type EmbeddedAsset = {
\tpath: string;
\troute: string;
\ttype: string;
};

const assets: EmbeddedAsset[] = [
${assetManifest}
];

function getCacheControl(route: string): string {
\tif (route.startsWith("/assets/")) {
\t\treturn "public, max-age=31536000, immutable";
\t}

\treturn "public, max-age=3600";
}

function getStartHandler(): StartHandler {
\tconst handler =
\t\t(serverModule as { default?: StartHandler; fetch?: StartHandler["fetch"] })
\t\t\t.default ??
\t\t((serverModule as { fetch?: StartHandler["fetch"] }).fetch
\t\t\t? { fetch: (serverModule as { fetch: StartHandler["fetch"] }).fetch }
\t\t\t: undefined);

\tif (!handler || typeof handler.fetch !== "function") {
\t\tthrow new Error("Missing TanStack Start fetch handler");
\t}

\treturn handler;
}

function createStaticRoutes(): Record<string, (request: Request) => Response> {
\treturn Object.fromEntries(
\t\tassets.map((asset) => [
\t\t\tasset.route,
\t\t\t(request: Request) => {
\t\t\t\tconst file = Bun.file(asset.path);

\t\t\t\treturn new Response(request.method === "HEAD" ? null : file, {
\t\t\t\t\theaders: {
\t\t\t\t\t\t"Cache-Control": getCacheControl(asset.route),
\t\t\t\t\t\t"Content-Length": String(file.size),
\t\t\t\t\t\t"Content-Type": asset.type,
\t\t\t\t\t},
\t\t\t\t});
\t\t\t},
\t\t]),
\t);
}

const handler = getStartHandler();
const server = Bun.serve({
\thostname: SERVER_HOST,
\tport: SERVER_PORT,
\troutes: {
\t\t...createStaticRoutes(),
\t\t"/*": async (request) => {
\t\t\ttry {
\t\t\t\treturn await handler.fetch(request);
\t\t\t} catch (error) {
\t\t\t\tconsole.error(\`Server handler error: \${String(error)}\`);
\t\t\t\treturn new Response("Internal Server Error", { status: 500 });
\t\t\t}
\t\t},
\t},
\terror(error) {
\t\tconsole.error(\`Uncaught server error: \${String(error)}\`);
\t\treturn new Response("Internal Server Error", { status: 500 });
\t},
});

const displayHost =
\tSERVER_HOST === "::" || SERVER_HOST === "0.0.0.0" ? "localhost" : SERVER_HOST;
console.log(\`NanaSplits listening on http://\${displayHost}:\${String(server.port)}\`);
`;
}

if (!(await pathExists(SERVER_ENTRY_POINT))) {
	throw new Error(`Missing ${SERVER_ENTRY_POINT}. Run "bun run build" first.`);
}

await Bun.$`rm -rf ${GENERATED_DIRECTORY}`;
await Bun.$`mkdir -p ${GENERATED_DIRECTORY}`;

const assets = await getClientAssets();
const compileTarget = getCompileTarget();

if (assets.length === 0) {
	throw new Error(`No client assets found in ${CLIENT_DIRECTORY}.`);
}

const entry = generateStandaloneEntry(assets);
await Bun.write(GENERATED_ENTRY_POINT, entry);

const result = await Bun.build({
	bytecode: true,
	compile: {
		outfile: OUTPUT_FILE,
		target: compileTarget,
	},
	define: {
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	entrypoints: [GENERATED_ENTRY_POINT],
	minify: true,
});

if (!result.success) {
	for (const log of result.logs) {
		console.error(log);
	}

	process.exit(1);
}

await Bun.$`chmod +x ${OUTPUT_FILE}`;
console.log(
	`Built ${OUTPUT_FILE} for ${compileTarget} with ${assets.length.toString()} embedded client assets.`,
);
