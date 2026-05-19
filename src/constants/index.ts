import { ENV } from "../config/env.js";

const RATE_LIMIT_MS = 900_000; // 15 minutes (15 * 60 * 1000)
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
const MAX_FILE_SIZE = 5_242_880; // 5MB (5 * 1024 * 1024)

const isProd = ENV.NODE_ENV === "production";
const ACCESS_TOKEN_NAME = "accessToken";
const ACCESS_TOKEN_MAX_AGE = 900_000; // 15 minutes (15 * 60 * 1000);
const REFRESH_TOKEN_NAME = "refreshToken";
const REFRESH_TOKEN_MAX_AGE = 43_200_000; // 30 days (30 * 24 * 60 * 60 * 1000);

const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "30d";

const POSTS_PER_PAGE = 7;
const POSTS_TOTAL_LIMIT = 700;

const SEARCH_LIMIT = 10; // max number of search results
const FEED_PER_PAGE = 7;
const FEED_TOTAL_LIMIT = 700;

const FAVORITES_LIMIT = 5;

export {
	ACCESS_EXPIRES_IN,
	ACCESS_TOKEN_MAX_AGE,
	ACCESS_TOKEN_NAME,
	ALLOWED_EXTENSIONS,
	FAVORITES_LIMIT,
	FEED_PER_PAGE,
	FEED_TOTAL_LIMIT,
	isProd,
	MAX_FILE_SIZE,
	POSTS_PER_PAGE,
	POSTS_TOTAL_LIMIT,
	RATE_LIMIT_MS,
	REFRESH_EXPIRES_IN,
	REFRESH_TOKEN_MAX_AGE,
	REFRESH_TOKEN_NAME,
	SEARCH_LIMIT,
};
