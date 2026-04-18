import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./tests/setup/dbTest.ts", "./tests/setup/appTest.ts"],
		include: ["tests/integration/**/*.test.ts"],
	},
});
