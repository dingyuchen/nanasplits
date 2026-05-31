import { existsSync } from "node:fs";

type BuildTarget = "build" | "build:binary";

type ResolveBuildEnvFilesOptions = {
	branch: string;
	fileExists: (file: string) => boolean;
};

const BRANCH_ENV_FILES: Record<string, string> = {
	dev: "dev.env",
	master: "master.env",
};

const FALLBACK_ENV_FILES = [".env", ".env.local"];

export function resolveBuildEnvFiles({
	branch,
	fileExists,
}: ResolveBuildEnvFilesOptions): string[] {
	const branchEnvFile = BRANCH_ENV_FILES[branch];
	if (branchEnvFile && fileExists(branchEnvFile)) {
		return [branchEnvFile];
	}

	return FALLBACK_ENV_FILES.filter(fileExists);
}

function stripInlineComment(value: string) {
	let quote: string | null = null;
	for (let index = 0; index < value.length; index += 1) {
		const char = value[index];
		const previous = value[index - 1];

		if ((char === '"' || char === "'") && previous !== "\\") {
			quote = quote === char ? null : (quote ?? char);
			continue;
		}

		if (char === "#" && quote === null && /\s/.test(previous ?? "")) {
			return value.slice(0, index).trimEnd();
		}
	}

	return value.trimEnd();
}

function unquote(value: string) {
	const trimmed = value.trim();
	const quote = trimmed[0];
	if (
		(quote === '"' || quote === "'") &&
		trimmed.endsWith(quote) &&
		trimmed.length >= 2
	) {
		return trimmed.slice(1, -1);
	}
	return stripInlineComment(trimmed).trim();
}

export function parseEnvFile(content: string): Record<string, string> {
	const values: Record<string, string> = {};

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const assignment = line.startsWith("export ")
			? line.slice("export ".length).trimStart()
			: line;
		const equalsIndex = assignment.indexOf("=");
		if (equalsIndex <= 0) continue;

		const key = assignment.slice(0, equalsIndex).trim();
		if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

		values[key] = unquote(assignment.slice(equalsIndex + 1));
	}

	return values;
}

async function gitBranch() {
	const proc = Bun.spawn(["git", "branch", "--show-current"], {
		stderr: "pipe",
		stdout: "pipe",
	});
	const output = await new Response(proc.stdout).text();
	await proc.exited;
	return output.trim();
}

async function existingBuildEnvFiles(branch: string) {
	return resolveBuildEnvFiles({
		branch,
		fileExists: (file) => existsSync(file),
	});
}

async function loadEnvFiles(files: string[]) {
	const values: Record<string, string> = {};
	for (const file of files) {
		Object.assign(values, parseEnvFile(await Bun.file(file).text()));
	}
	return values;
}

async function runCommand(args: string[], env: NodeJS.ProcessEnv) {
	const proc = Bun.spawn(args, {
		env,
		stderr: "inherit",
		stdout: "inherit",
	});
	const exitCode = await proc.exited;
	if (exitCode !== 0) {
		throw new Error(`${args.join(" ")} failed with exit code ${exitCode}`);
	}
}

async function runBuildTarget(target: BuildTarget, env: NodeJS.ProcessEnv) {
	await runCommand(["bun", "--bun", "vite", "build"], env);

	if (target === "build:binary") {
		await runCommand(
			["bun", "--bun", "scripts/generate-embedded-client-manifest.ts"],
			env,
		);
		await runCommand(
			[
				"bun",
				"build",
				"--compile",
				"--minify",
				"--sourcemap",
				"--bytecode",
				"--format=esm",
				"--asset-naming=[dir]/[name].[ext]",
				'--define=process.env.NODE_ENV="production"',
				"server.ts",
				"dist/server/server.js",
				".deploy/embedded-client-assets.ts",
				"--outfile",
				"dist/nanasplits",
			],
			env,
		);
	}
}

async function main() {
	const target = Bun.argv[2] as BuildTarget | undefined;
	if (target !== "build" && target !== "build:binary") {
		console.error("Usage: bun --bun scripts/build-env.ts <build|build:binary>");
		process.exit(1);
	}

	const branch = process.env.BUILD_BRANCH ?? (await gitBranch());
	const files = await existingBuildEnvFiles(branch);
	const loadedEnv = await loadEnvFiles(files);
	const env = {
		...process.env,
		...loadedEnv,
	};

	if (!env.VITE_DEPLOY_TARGET && (branch === "master" || branch === "dev")) {
		env.VITE_DEPLOY_TARGET = branch;
	}

	console.log(
		files.length > 0
			? `Building ${target} on ${branch || "unknown branch"} with ${files.join(", ")}.`
			: `Building ${target} on ${branch || "unknown branch"} with process environment only.`,
	);
	await runBuildTarget(target, env);
}

if (import.meta.main) {
	await main();
}
