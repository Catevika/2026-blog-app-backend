import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuthLimiter } from "../../../src/middleware/rate-limit.js";

describe("createAuthLimiter (Integration)", () => {
	const ORIGINAL_ENV = { ...process.env };

	beforeEach(() => {
		// Enable the rate limiter for this test suite
		process.env.VITEST = "true";
		process.env.TEST_RATE_LIMITER = "true";
	});

	afterEach(() => {
		// Restore environment
		process.env = { ...ORIGINAL_ENV };
	});

	it("blocks after 5 requests with 429", async () => {
		const app = express();
		app.use(cookieParser());
		app.use(createAuthLimiter());
		app.get("/login", (_req, res) => res.json({ ok: true }));

		// First 5 requests → allowed
		for (let i = 0; i < 5; i++) {
			const res = await request(app).get("/login");
			expect(res.status).toBe(200);
			expect(res.body.ok).toBe(true);
		}

		// 6th request → blocked
		const blocked = await request(app).get("/login");

		expect(blocked.status).toBe(429);
		expect(blocked.body).toEqual({
			error: "Too many login attempts, try again later",
		});
	});
});
