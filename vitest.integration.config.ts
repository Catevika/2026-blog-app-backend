import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./tests/setup/dbTest.ts", "./tests/setup/appTest.ts"],
		include: [
			"tests/integration/**/*.test.ts",
			"tests/integration/**/*.spec.ts",
		],
		testTimeout: 30000,
		hookTimeout: 30000,
		bail: 0,
		coverage: {
			enabled: true,
			provider: "v8",
			reportsDirectory: "coverage/integration",
			reporter: ["text", "json", "html", "lcov"],
		},
		typecheck: {
			enabled: false,
		},
	},
});
