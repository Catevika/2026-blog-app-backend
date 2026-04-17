import "dotenv/config";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { rateLimit } from "express-rate-limit";
import { ENV, RATE_LIMIT_MS } from "../config/index.js";

export function createAuthLimiter(): RateLimitRequestHandler {
	return rateLimit({
		windowMs: RATE_LIMIT_MS, // 15 minutes
		max: 5,
		message: { error: "Too many login attempts, try again later" },
		standardHeaders: true,
		legacyHeaders: false,
		skip: () => {
			// Disable limiter for ALL tests except the rateLimiter tests
			if (ENV.VITEST === "true" && ENV.TEST_RATE_LIMITER !== "true") {
				return true;
			}

			// Disable limiter in dev server (optional)
			if (ENV.NODE_ENV === "development") {
				return true;
			}

			return false;
		},
	});
}
