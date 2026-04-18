import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
	ACCESS_COOKIE_NAME,
	ACCESS_TOKEN_EXPIRES_IN,
	ACCESS_TOKEN_SECRET,
} from "../../../src/config/authConfig.js";
import { authenticateToken } from "../../../src/middleware/requireAuth.js";
import { createTestApp } from "../../helpers/createTestApp.js";

describe("authenticateToken middleware", () => {
	it("does nothing when no token cookie is present", async () => {
		const app = createTestApp((req, res) =>
			authenticateToken(req, res, () => res.json({ ok: true, user: req.user })),
		);

		const res = await request(app).get("/test").expect(200);

		expect(res.body.ok).toBe(true);
		expect(res.body.user).toBeUndefined();
	});

	it("ignores invalid token and continues without setting req.user", async () => {
		const app = createTestApp((req, res) =>
			authenticateToken(req, res, () => res.json({ ok: true, user: req.user })),
		);

		const badToken = jwt.sign({ userId: "123" }, "wrong-secret");

		const res = await request(app)
			.get("/test")
			.set("Cookie", `${ACCESS_COOKIE_NAME}=${badToken}`)
			.expect(200);

		expect(res.body.ok).toBe(true);
		expect(res.body.user).toBeUndefined();
	});

	it("sets req.user when token is valid", async () => {
		const app = createTestApp((req, res) =>
			authenticateToken(req, res, () => res.json({ ok: true, user: req.user })),
		);

		const token = jwt.sign({ userId: "abc123" }, ACCESS_TOKEN_SECRET, {
			expiresIn: "1h",
		});

		const res = await request(app)
			.get("/test")
			.set("Cookie", `${ACCESS_COOKIE_NAME}=${token}`)
			.expect(200);

		expect(res.body.ok).toBe(true);
		expect(res.body.user).toEqual({ userId: "abc123" });
	});

	const sign = (payload: object, opts?: jwt.SignOptions) =>
		jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN, ...opts });

	it("continues as anonymous when no cookie is present", async () => {
		const app = createTestApp(authenticateToken);

		const res = await request(app).get("/test");

		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});

	it("continues as anonymous when token is invalid", async () => {
		const app = createTestApp(authenticateToken);

		const res = await request(app)
			.get("/test")
			.set("Cookie", `${ACCESS_COOKIE_NAME}=invalid.token`);

		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});

	it("continues as anonymous when token is expired", async () => {
		const expiredToken = sign({ userId: "123" }, { expiresIn: "-1s" });

		const app = createTestApp(authenticateToken);

		const res = await request(app)
			.get("/test")
			.set("Cookie", `${ACCESS_COOKIE_NAME}=${expiredToken}`);

		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});

	it("attaches req.user when token is valid", async () => {
		const token = sign({ userId: "abc123" });

		const app = createTestApp(authenticateToken);

		const res = await request(app).get("/test").set("Cookie", `${ACCESS_COOKIE_NAME}=${token}`);

		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});
});
