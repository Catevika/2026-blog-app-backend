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
		coverage: {
			enabled: true,
			provider: "v8",
			reportsDirectory: "coverage/integration",
			reporter: ["text", "json", "html", "lcov"],
		},
		typecheck: {
			enabled: true,
			include: ["src/**/*.{ts,js}", "tests/**/*.{ts,js}"],
		},
	},
});
