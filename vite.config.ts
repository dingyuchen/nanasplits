import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import viteSolid from "vite-plugin-solid";

const config = defineConfig({
	server: {
		allowedHosts: ["nanasplitsdev.ding.gg"],
	},
	resolve: { dedupe: ["@tanstack/router-core"], tsconfigPaths: true },
	plugins: [
		devtools(),
		tanstackStart(),
		viteSolid({ ssr: true }),
		tailwindcss(),
		nitro({ preset: "bun", rollupConfig: { external: [/^@sentry\//] } }),
	],
});

export default config;
