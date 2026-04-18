import type { Express } from "express";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { REFRESH_COOKIE_NAME } from "../../../src/config/authConfig.js";
import { me, verify } from "../../../src/controllers/authController.js";
import { RefreshToken } from "../../../src/models/RefreshToken.js";
import { User } from "../../../src/models/User.js";
import * as tokenService from "../../../src/services/tokenService.js";
import { createTestUser } from "../../factories/userFactory.js";
import { createAuthTestApp } from "../../helpers/createAuthTestApp.js";

describe("authController (Integration)", () => {
	let app: Express;

	beforeEach(async () => {
		app = createAuthTestApp();
		await User.deleteMany({});
		await RefreshToken.deleteMany({});
	});

	//
	// ────────────────────────────────────────────────
	// SIGNUP
	// ────────────────────────────────────────────────
	//

	it("returns 400 when email or password is missing", async () => {
		const res = await request(app).post("/api/auth/signup").send({ email: "" });

		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/required/i);
	});

	it("fails to signup with invalid email", async () => {
		const res = await request(app)
			.post("/api/auth/signup")
			.send({ email: "bad-email", password: "12345678" });

		expect(res.status).toBe(500);
	});

	it("fails to signup when email already exists", async () => {
		const { email } = await createTestUser();

		const res = await request(app).post("/api/auth/signup").send({ email, password: "12345678" });

		expect(res.status).toBe(409);
		expect(res.body.message).toMatch(/email already exists/i);
	});

	it("returns 500 when DB throws unexpectedly", async () => {
		vi.spyOn(User, "findOne").mockRejectedValueOnce(new Error("DB exploded"));

		const res = await request(app)
			.post("/api/auth/signup")
			.send({ email: "test@example.com", password: "12345678" });

		expect(res.status).toBe(500);
	});

	//
	// ────────────────────────────────────────────────
	// LOGIN
	// ────────────────────────────────────────────────
	//

	it("returns 400 when email or password is missing", async () => {
		const res = await request(app).post("/api/auth/login").send({ email: "" });

		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/required/i);
	});

	it("fails login when user does not exist", async () => {
		const res = await request(app)
			.post("/api/auth/login")
			.send({ email: "ghost@example.com", password: "12345678" });

		expect(res.status).toBe(401);
	});

	it("fails login with wrong password", async () => {
		const { email } = await createTestUser();

		const res = await request(app)
			.post("/api/auth/login")
			.send({ email, password: "wrongpassword" });

		expect(res.status).toBe(401);
	});

	it("returns 500 when DB throws unexpectedly", async () => {
		vi.spyOn(User, "findOne").mockRejectedValueOnce(new Error("DB exploded"));

		const res = await request(app)
			.post("/api/auth/login")
			.send({ email: "test@example.com", password: "12345678" });

		expect(res.status).toBe(500);
	});

	//
	// ────────────────────────────────────────────────
	// REFRESH TOKEN
	// ────────────────────────────────────────────────
	//

	it("returns 401 when refresh cookie is missing", async () => {
		const res = await request(app).post("/api/auth/refresh");
		expect(res.status).toBe(401);
	});

	it("fails refresh when no cookie is sent", async () => {
		const res = await request(app).post("/api/auth/refresh");
		expect(res.status).toBe(401);
	});

	it("fails refresh when token is not found in DB", async () => {
		const res = await request(app).post("/api/auth/refresh").set("Cookie", "refreshToken=invalid");

		expect(res.status).toBe(401);
	});

	it("returns 401 when refresh token is not found in DB", async () => {
		const token = tokenService.generateRefreshToken("123");

		const res = await request(app)
			.post("/api/auth/refresh")
			.set("Cookie", `${REFRESH_COOKIE_NAME}=${token}`);

		expect(res.status).toBe(401);
	});

	it("returns 401 when refresh token is expired", async () => {
		const user = await User.create({
			name: "Test User",
			email: "a@b.com",
			passwordHash: "x",
			role: "user",
		});

		const expiredToken = tokenService.generateRefreshToken(user._id.toString());

		await RefreshToken.create({
			token: expiredToken,
			userId: user._id.toString(),
			expiresAt: new Date(Date.now() - 1000),
			isValid: true,
		});

		const res = await request(app)
			.post("/api/auth/refresh")
			.set("Cookie", `${REFRESH_COOKIE_NAME}=${expiredToken}`);

		expect(res.status).toBe(401);
	});

	it("returns 401 when user no longer exists", async () => {
		const userId = "507f1f77bcf86cd799439011";
		const token = tokenService.generateRefreshToken(userId);

		await RefreshToken.create({
			token,
			userId,
			expiresAt: new Date(Date.now() + 100000),
			isValid: true,
		});

		const res = await request(app)
			.post("/api/auth/refresh")
			.set("Cookie", `${REFRESH_COOKIE_NAME}=${token}`);

		expect(res.status).toBe(401);
	});

	it("returns 500 when DB throws unexpectedly", async () => {
		vi.spyOn(RefreshToken, "findOne").mockRejectedValueOnce(new Error("DB exploded"));

		const res = await request(app)
			.post("/api/auth/refresh")
			.set("Cookie", `${REFRESH_COOKIE_NAME}=abc`);

		expect(res.status).toBe(500);
	});

	//
	// ────────────────────────────────────────────────
	// LOGOUT
	// ────────────────────────────────────────────────
	//

	it("logout succeeds even without refresh token cookie", async () => {
		const res = await request(app).post("/api/auth/logout");
		expect(res.status).toBe(200);
	});

	it("logout: returns 500 when DB update fails", async () => {
		const app = createAuthTestApp();

		const token = tokenService.generateRefreshToken("123");

		vi.spyOn(RefreshToken, "findOneAndUpdate").mockRejectedValueOnce(new Error("DB exploded"));

		const res = await request(app)
			.post("/api/auth/logout")
			.set("Cookie", `${REFRESH_COOKIE_NAME}=${token}`);

		expect(res.status).toBe(500);
	});

	//
	// ────────────────────────────────────────────────
	// VERIFY
	// ────────────────────────────────────────────────
	//

	it("verify: returns 401 when req.user is missing", async () => {
		const app = express();

		app.get(
			"/test",
			(req, _res, next) => {
				req.user = { userId: "" };
				next();
			},
			verify,
		);

		const res = await request(app).get("/test");
		expect(res.status).toBe(401);
	});

	it("verify: returns 401 when user does not exist", async () => {
		const app = express();

		app.get(
			"/test",
			(req, _res, next) => {
				req.user = { userId: "507f1f77bcf86cd799439011" };
				next();
			},
			verify,
		);

		const res = await request(app).get("/test");
		expect(res.status).toBe(401);
	});

	//
	// ────────────────────────────────────────────────
	// ME
	// ────────────────────────────────────────────────
	//

	it("me: returns 401 when req.user is missing", async () => {
		const app = createAuthTestApp();

		app.get(
			"/test",
			(req, _res, next) => {
				req.user = { userId: "" };
				next();
			},
			me,
		);

		const res = await request(app).get("/test");
		expect(res.status).toBe(401);
	});

	it("me: returns 401 when user does not exist", async () => {
		const app = express();

		app.get(
			"/test",
			(req, _res, next) => {
				req.user = { userId: "507f1f77bcf86cd799439011" };
				next();
			},
			me,
		);

		const res = await request(app).get("/test");
		expect(res.status).toBe(401);
	});
});
