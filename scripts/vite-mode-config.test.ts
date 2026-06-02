import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import packageJson from "../package.json" with { type: "json" };

const masterService = await readFile(
	"deploy/systemd/nanasplits-master@.service",
	"utf8",
);
const devService = await readFile(
	"deploy/systemd/nanasplits-dev.service",
	"utf8",
);
const gitignore = await readFile(".gitignore", "utf8");

describe("Vite build modes", () => {
	test("production build script passes the production mode explicitly", () => {
		expect(packageJson.scripts.build).toBe(
			"bun --bun vite build --mode production",
		);
	});

	test("dev build script builds with the dev mode", () => {
		expect(packageJson.scripts["build:dev"]).toBe(
			"bun --bun vite build --mode dev",
		);
	});
});

describe("service env files", () => {
	test("production service uses Vite's production mode env filename", () => {
		expect(masterService).toContain(
			"EnvironmentFile=/home/hermes/nanasplits/.env.production",
		);
	});

	test("dev service uses Vite's dev mode env filename", () => {
		expect(devService).toContain(
			"EnvironmentFile=/home/hermes/nanasplits/.env.dev",
		);
	});

	test("mode env files stay ignored because they contain deployment secrets", () => {
		expect(gitignore).toMatch(/^\.env\.\*$/m);
	});
});
