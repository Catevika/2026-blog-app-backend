import type { NextFunction, Request, Response } from "express";
import type { RateLimiterRes } from "rate-limiter-flexible";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { ENV, RATE_LIMIT_MS } from "../config/index.js";

const loginLimiter = new RateLimiterMemory({
	points: 5,
	duration: RATE_LIMIT_MS / 1000,
	blockDuration: RATE_LIMIT_MS / 1000,
});

// Normalize IP (IPv6 → IPv4)
function getClientIp(req: Request) {
	const rawIp = req.ip ?? "0.0.0.0";
	return rawIp.replace("::ffff:", "");
}

// Normalize email
function getEmail(req: Request) {
	return (req.body?.email ?? "unknown").toString().toLowerCase();
}

// Build the EXACT SAME key for both consume + reset
function getLimiterKey(req: Request) {
	const ip = getClientIp(req);
	const email = getEmail(req);
	return `login:${ip}:${email}`;
}

export async function authRateLimit(req: Request, res: Response, next: NextFunction) {
	if (ENV.VITEST === "true" && ENV.TEST_RATE_LIMITER !== "true") {
		return next();
	}

	const key = getLimiterKey(req);

	try {
		await loginLimiter.consume(key);
		return next();
	} catch (err: unknown) {
		const rl = err as RateLimiterRes;
		const retrySecs = Math.ceil(rl.msBeforeNext / 1000);

		res.setHeader("Retry-After", retrySecs.toString());

		return res.status(429).json({
			error: "Too many login/signup attempts.",
			retryAfter: retrySecs,
		});
	}
}

export async function resetAuthRateLimit(req: Request) {
	const key = getLimiterKey(req);
	await loginLimiter.delete(key);
}
