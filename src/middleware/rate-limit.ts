import "dotenv/config";
import type { RateLimitRequestHandler } from "express-rate-limit";
import { rateLimit } from "express-rate-limit";
import { ENV, RATE_LIMIT_MS } from "../config/index.js";

export function createAuthLimiter(): RateLimitRequestHandler {
	return rateLimit({
		windowMs: RATE_LIMIT_MS, // 15 minutes
		limit: 5,
		standardHeaders: "draft-8",
		legacyHeaders: false,
		message: { error: "Too many signup/login attempts." },
		handler: (req, res, _next, options) => {
			const resetTime = req.rateLimit?.resetTime;

			const retryAfterSeconds = resetTime
				? Math.ceil((resetTime.getTime() - Date.now()) / 1000)
				: Math.ceil(options.windowMs / 1000);

			res.setHeader("Retry-After", retryAfterSeconds.toString());

			res.status(options.statusCode).json({
				error: "Too many signup/login attempts.",
				retryAfter: retryAfterSeconds,
			});
		},

		skip: () => {
			// Disable limiter for ALL tests except the rateLimiter tests
			if (ENV.VITEST === "true" && ENV.TEST_RATE_LIMITER !== "true") {
				return true;
			}

			return false;
		},
	});
}
