import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/solid-start/plugin/vite";
import { defineConfig } from "vite";
import viteSolid from "vite-plugin-solid";

const config = defineConfig({
	server: {
		allowedHosts: ["nanasplitsdev.ding.gg"],
	},
	resolve: { dedupe: ["@tanstack/router-core"], tsconfigPaths: true },
	plugins: [
		devtools(),
		tanstackStart({
			prerender: {
				enabled: true,
				autoStaticPathsDiscovery: true,
			},
		}),
		viteSolid({ ssr: true }),
		tailwindcss(),
	],
});

export default config;
