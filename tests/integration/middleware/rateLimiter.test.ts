import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authRateLimit, resetAuthRateLimit } from "../../../src/middleware/rate-limit.js";

describe("authRateLimit (Integration)", () => {
	const ORIGINAL_ENV = { ...process.env };

	beforeEach(() => {
		process.env.VITEST = "true";
		process.env.TEST_RATE_LIMITER = "true";
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	function createApp() {
		const app = express();
		app.use(express.json());
		app.use(cookieParser());
		app.use(authRateLimit);
		app.post("/login", (_req, res) => res.json({ ok: true }));
		return app;
	}

	it("blocks after 5 requests with 429", async () => {
		const app = createApp();

		// First 5 requests → allowed
		for (let i = 0; i < 5; i++) {
			const res = await request(app).post("/login").send({ email: "test@example.com" });

			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
		}

		// 6th request → blocked
		const blocked = await request(app).post("/login").send({ email: "test@example.com" });

		expect(blocked.status).toBe(429);
		expect(blocked.body.error).toBe("Too many login/signup attempts.");
		expect(typeof blocked.body.retryAfter).toBe("number");
		expect(blocked.body.retryAfter).toBeGreaterThan(0);

		// Cleanup limiter key
		await resetAuthRateLimit({
			body: { email: "test@example.com" },
			ip: "127.0.0.1",
		} as any);
	});
});
