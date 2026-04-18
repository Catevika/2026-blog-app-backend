import type { AppEnv } from "../types/index.js";

export const ENV: AppEnv = {
	get NODE_ENV() {
		return process.env.NODE_ENV ?? "test";
	},
	get PORT() {
		return process.env.PORT ?? "3000";
	},
	get MONGO_URI() {
		return process.env.MONGO_URI ?? "";
	},
	get ACCESS_TOKEN_SECRET() {
		return process.env.ACCESS_TOKEN_SECRET ?? "test-access-secret";
	},
	get REFRESH_TOKEN_SECRET() {
		return process.env.REFRESH_TOKEN_SECRET ?? "test-refresh-secret";
	},
	get ROTATE_REFRESH_TOKENS() {
		return process.env.ROTATE_REFRESH_TOKENS ?? "true";
	},
	get VITEST() {
		return process.env.VITEST ?? "false";
	},
	get TEST_RATE_LIMITER() {
		return process.env.TEST_RATE_LIMITER ?? "false";
	},
	get CORS_ORIGIN() {
		return process.env.CORS_ORIGIN ?? "http://localhost:5173";
	},
};
