export const AUTH = {
	ACCESS_TOKEN_EXPIRES_IN: "15m",
	REFRESH_TOKEN_EXPIRES_IN: "30d",

	ACCESS_TOKEN_MAX_AGE: 900_000, // (15 * 60 * 1000) = 15 minutes,
	REFRESH_TOKEN_MAX_AGE: 2_592_000_000, // (30 * 24 * 60 * 60 * 1000) = 30 days,

	ACCESS_COOKIE_NAME: "accessToken",
	REFRESH_COOKIE_NAME: "refreshToken",

	COOKIE_OPTIONS: {
		httpOnly: true,
		sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
		secure: process.env.NODE_ENV === "production",
	},
} as const;
