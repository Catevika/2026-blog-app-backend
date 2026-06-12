import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";

export default [
	{
		ignores: ["dist/**", "node_modules/**", "coverage/**", "uploads/**", "*.js"],
	},

	// Base ESLint + TypeScript recommended configs
	js.configs.recommended,
	...tseslint.configs.recommended,

	// Type-aware linting for backend source code
	{
		files: ["src/**/*.ts"],
		plugins: {
			prettier: prettierPlugin,
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// TypeScript rules (backend-friendly)
			"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/consistent-type-imports": "error",

			// Node backend rules
			"no-console": "off",

			// Prettier integration
			"prettier/prettier": "error",
		},
	},

	// Non-type-aware linting for tests
	{
		files: ["tests/**/*.ts"],
		languageOptions: {
			parser: tseslint.parser,
		},
		rules: {
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/consistent-type-imports": "off",
		},
	},

	// Prettier config (must be last)
	prettierConfig,
];
