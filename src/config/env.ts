import type { AppEnv } from "../types";

export const ENV: AppEnv = {
	NODE_ENV: process.env.NODE_ENV ?? "development",
	PORT: process.env.PORT ?? "3000",
	MONGO_URI: process.env.MONGO_URI ?? "",
	ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ?? "test-access-secret",
	REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ?? "test-refresh-secret",
	VITEST: process.env.VITEST ?? "false",
	TEST_RATE_LIMITER: process.env.TEST_RATE_LIMITER ?? "false",
	CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
