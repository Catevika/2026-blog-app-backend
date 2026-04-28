/// <reference types="node" />
/// <reference types="vitest" />

declare namespace NodeJS {
	interface ProcessEnv {
		VITEST?: string;
		TEST_RATE_LIMITER?: string;
		NODE_ENV?: string;
		PORT?: string;
		MONGO_URI?: string;
		ACCESS_TOKEN_SECRET?: string;
		REFRESH_TOKEN_SECRET?: string;
		ROTATE_REFRESH_TOKENS?: string;
		CORS_ORIGIN?: string;
	}
}
