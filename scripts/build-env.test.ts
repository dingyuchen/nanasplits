import { describe, expect, it } from "vitest";

import { parseEnvFile, resolveBuildEnvFiles } from "./build-env";

describe("resolveBuildEnvFiles", () => {
	it("uses dev.env on the dev branch when present", () => {
		expect(
			resolveBuildEnvFiles({
				branch: "dev",
				fileExists: (file) => file === "dev.env",
			}),
		).toEqual(["dev.env"]);
	});

	it("uses master.env on the master branch when present", () => {
		expect(
			resolveBuildEnvFiles({
				branch: "master",
				fileExists: (file) => file === "master.env",
			}),
		).toEqual(["master.env"]);
	});

	it("falls back to .env and .env.local when the branch env is missing", () => {
		expect(
			resolveBuildEnvFiles({
				branch: "dev",
				fileExists: (file) => file === ".env" || file === ".env.local",
			}),
		).toEqual([".env", ".env.local"]);
	});
});

describe("parseEnvFile", () => {
	it("parses common dotenv assignment forms", () => {
		expect(
			parseEnvFile(`
# comment
PLAIN=value
export EXPORTED="quoted value"
SINGLE='single quoted'
INLINE=kept # with comment
EMPTY=
`),
		).toEqual({
			EMPTY: "",
			EXPORTED: "quoted value",
			INLINE: "kept",
			PLAIN: "value",
			SINGLE: "single quoted",
		});
	});
});
