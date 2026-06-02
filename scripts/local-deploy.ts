import path from "node:path";

type DeployTarget = "master" | "dev";

const DEPLOY_ROOT = process.env.DEPLOY_ROOT ?? "/home/hermes/nanasplits";
const DEPLOY_BINARY = process.env.DEPLOY_BINARY ?? "dist/nanasplits";
const RELEASE_RETENTION_DAYS = "14";

function exitWithUsage(): never {
	console.error(
		"Usage: bun run deploy:local <master|dev>\n       bun run deploy:local --dest <master|dev>",
	);
	process.exit(1);
}

function toDeployTarget(value: string | undefined): DeployTarget | undefined {
	if (value === "master" || value === "dev") {
		return value;
	}
}

function parseTarget(args: string[]): DeployTarget {
	const positionalTarget = toDeployTarget(args[0]);
	if (positionalTarget) {
		return positionalTarget;
	}

	const destIndex = args.indexOf("--dest");
	const flagTarget = toDeployTarget(
		destIndex >= 0 ? args[destIndex + 1] : undefined,
	);
	if (flagTarget) {
		return flagTarget;
	}

	const prefixedTarget = toDeployTarget(
		args.find((arg) => arg.startsWith("--dest="))?.slice("--dest=".length),
	);
	if (prefixedTarget) {
		return prefixedTarget;
	}

	exitWithUsage();
}

async function gitSha(): Promise<string> {
	try {
		return (await Bun.$`git -C ${DEPLOY_ROOT} rev-parse HEAD`.text()).trim();
	} catch {
		return "nogit";
	}
}

async function releaseId(): Promise<string> {
	const value = process.env.RELEASE_ID ?? (await gitSha());

	if (!/^[\w.-]+$/.test(value)) {
		throw new Error(
			"RELEASE_ID can only contain letters, numbers, _, ., and -.",
		);
	}

	return value;
}

const target = parseTarget(Bun.argv.slice(2));
const binDirectory = path.join(DEPLOY_ROOT, "bin");
const release = path.join(
	binDirectory,
	`nanasplits-${target}-${await releaseId()}`,
);
const stableSymlink = path.join(DEPLOY_ROOT, target);
const nextSymlink = `${stableSymlink}.next`;

if (!(await Bun.file(DEPLOY_BINARY).exists())) {
	console.log(
		`Deploy binary not found at ${DEPLOY_BINARY}; building it first.`,
	);
	const buildScript = target === "dev" ? "build:binary:dev" : "build:binary";
	await Bun.$`bun --no-env-file run ${buildScript}`.cwd(DEPLOY_ROOT);
}

console.log(`Deploying ${DEPLOY_BINARY} to ${release}.`);
await Bun.$`mkdir -p ${binDirectory}`;
await Bun.$`cp ${DEPLOY_BINARY} ${release}`;
await Bun.$`chmod 755 ${release}`;

console.log(`Updating ${stableSymlink}.`);
await Bun.$`ln -sfn ${release} ${nextSymlink}`;
await Bun.$`mv -f ${nextSymlink} ${stableSymlink}`;
await Bun.$`bun run touch ${target}`;

console.log(
	`Pruning ${target} releases older than ${RELEASE_RETENTION_DAYS} days.`,
);
await Bun.$`find ${binDirectory} -maxdepth 1 -type f -name ${`nanasplits-${target}-*`} ! -name ${path.basename(release)} -mtime +${RELEASE_RETENTION_DAYS} -delete`;

console.log(`Deployed ${target}: ${stableSymlink} -> ${release}`);
