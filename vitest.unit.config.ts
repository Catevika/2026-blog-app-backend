import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.spec.ts"],
		globals: true,
		environment: "node",
		setupFiles: [],
		testTimeout: 30_000,
		coverage: {
			enabled: true,
			provider: "v8",
			reportsDirectory: "coverage/unit",
			reporter: ["text", "json", "html", "lcov"],
		},
		typecheck: {
			enabled: true,
			include: ["src/**/*.{ts,js}", "tests/**/*.{ts,js}"],
		},
	},
});
