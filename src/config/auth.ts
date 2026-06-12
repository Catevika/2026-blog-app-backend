export const AUTH = {
	ACCESS_TOKEN_EXPIRES_IN: "15m",

	// Default refresh token lifetime (normal login)
	REFRESH_TOKEN_EXPIRES_IN: "1d",
	REFRESH_TOKEN_MAX_AGE: 1 * 24 * 60 * 60 * 1000, // 1 day

	// Remember-me refresh token lifetime
	REFRESH_TOKEN_EXPIRES_IN_REMEMBER: "60d",
	REFRESH_TOKEN_MAX_AGE_REMEMBER: 60 * 24 * 60 * 60 * 1000, // 60 days

	ACCESS_TOKEN_MAX_AGE: 15 * 60 * 1000, // 15 minutes

	ACCESS_COOKIE_NAME: "accessToken",
	REFRESH_COOKIE_NAME: "refreshToken",

	COOKIE_OPTIONS: {
		httpOnly: true,
		sameSite: process.env?.["NODE_ENV"] === "production" ? "strict" : "lax",
		secure: process.env?.["NODE_ENV"] === "production",
	},
} as const;
