export const testConfig = {
	NODE_ENV: process.env.NODE_ENV ?? "test",
	ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ?? "test-secret",
	REFRESH_TOKEN_SECRET:
		process.env.REFRESH_TOKEN_SECRET ?? "test-refresh-secret",
	ROTATE_REFRESH_TOKENS: process.env.ROTATE_REFRESH_TOKENS ?? "true",
};
