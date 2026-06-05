import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
		viteReact(),
		babel({ presets: [reactCompilerPreset({ target: "19" })] }),
		tailwindcss(),
	],
});

export default config;
