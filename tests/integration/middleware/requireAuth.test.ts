import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
	ACCESS_COOKIE_NAME,
	ACCESS_TOKEN_EXPIRES_IN,
	ACCESS_TOKEN_SECRET,
} from "../../../src/config/authConfig.js";
import { ENV } from "../../../src/config/index.js";
import { requireAuth } from "../../../src/middleware/requireAuth.js";
import { createTestApp } from "../../helpers/createTestApp.js";

describe("requireAuth middleware", () => {
	it("rejects when no access token is provided", async () => {
		const app = createTestApp(requireAuth);

		const res = await request(app).get("/test").expect(401);

		expect(res.body.error).toBe("Unauthorized");
	});

	it("rejects when token has invalid signature", async () => {
		const app = createTestApp(requireAuth);

		const bad = jwt.sign({ userId: "123" }, "wrong-secret");

		const res = await request(app).get("/test").set("Cookie", `accessToken=${bad}`).expect(401);

		expect(res.body.error).toBe("Invalid token");
	});

	it("accepts a valid token and sets req.user", async () => {
		const app = createTestApp((req, res) =>
			requireAuth(req, res, () => res.json({ ok: true, user: req.user })),
		);

		const token = jwt.sign({ userId: "abc123" }, ENV.ACCESS_TOKEN_SECRET, {
			expiresIn: "1h",
		});

		const res = await request(app).get("/test").set("Cookie", `accessToken=${token}`).expect(200);

		expect(res.body.ok).toBe(true);
		expect(res.body.user.userId).toBe("abc123");
	});

	const sign = (payload: object, opts?: jwt.SignOptions) =>
		jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN, ...opts });

	it("returns 401 when no access token cookie is present", async () => {
		const app = createTestApp(requireAuth);

		const res = await request(app).get("/test");

		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("returns 401 when token is invalid", async () => {
		const app = createTestApp(requireAuth);

		const res = await request(app)
			.get("/test")
			.set("Cookie", `${ACCESS_COOKIE_NAME}=invalid.token.here`);

		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Invalid token");
	});

	it("returns 401 when token is expired", async () => {
		const expiredToken = sign({ userId: "123" }, { expiresIn: "-1s" });

		const app = createTestApp(requireAuth);

		const res = await request(app)
			.get("/test")
			.set("Cookie", `${ACCESS_COOKIE_NAME}=${expiredToken}`);

		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Token expired");
	});

	it("returns 401 when token does not contain userId", async () => {
		const token = sign({}); // no userId

		const app = createTestApp(requireAuth);

		const res = await request(app).get("/test").set("Cookie", `${ACCESS_COOKIE_NAME}=${token}`);

		expect(res.status).toBe(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("allows request when token is valid and contains userId", async () => {
		const token = sign({ userId: "abc123" });

		const app = createTestApp(requireAuth);

		const res = await request(app).get("/test").set("Cookie", `${ACCESS_COOKIE_NAME}=${token}`);

		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});
});
