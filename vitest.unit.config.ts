import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.spec.ts"],
		setupFiles: [],
		testTimeout: 10000,
		bail: 0,
		coverage: {
			enabled: true,
			provider: "v8",
			reportsDirectory: "coverage/unit",
			reporter: ["text", "json", "html", "lcov"],
			exclude: ["tests/**", "dist/**"],
		},
		typecheck: {
			enabled: false,
		},
	},
});
