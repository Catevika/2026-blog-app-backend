import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAgent, loginTestUser } from "../../helpers/authHelpers.js";
import { app } from "../../setup/appTest.js";

const getCookies = (res: any) => {
	const cookies = res.get("Set-Cookie");
	return Array.isArray(cookies) ? cookies : cookies ? [cookies] : [];
};

describe("Auth Routes", () => {
	it("signup creates a user and sets cookies", async () => {
		const res = await request(app)
			.post("/api/auth/signup")
			.send({
				email: "signup@test.com",
				password: "12345678",
				name: "Signup User",
			})
			.expect(201);

		expect(res.body.user.email).toBe("signup@test.com");

		const cookies = getCookies(res);
		expect(cookies.some((c: string) => c.startsWith("accessToken="))).toBe(true);
		expect(cookies.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
	});

	it("login works with valid credentials", async () => {
		const { user, agent } = await loginTestUser();

		const res = await agent.get("/api/auth/me").expect(200);
		expect(res.body.user.email).toBe(user.email);
	});

	it("me returns 401 without cookies", async () => {
		await request(app).get("/api/auth/me").expect(401);
	});

	it("refresh rotates tokens", async () => {
		const { agent } = await loginTestUser();

		const res = await agent.post("/api/auth/refresh").expect(200);

		const cookies = res.get("Set-Cookie");
		expect(cookies?.some((c: string) => c.startsWith("accessToken="))).toBe(true);
		expect(cookies?.some((c: string) => c.startsWith("refreshToken="))).toBe(true);
	});

	it("logout clears cookies and prevents further access", async () => {
		const { agent } = await loginTestUser();

		await agent.post("/api/auth/logout").expect(200);

		await agent.get("/api/auth/me").expect(401);
	});

	it("full flow: signup → me → refresh → logout", async () => {
		const agent = createAgent();

		await agent
			.post("/api/auth/signup")
			.send({
				email: "flow@test.com",
				password: "12345678",
				name: "Flow User",
			})
			.expect(201);

		await agent.get("/api/auth/me").expect(200);
		await agent.post("/api/auth/refresh").expect(200);
		await agent.post("/api/auth/logout").expect(200);
		await agent.get("/api/auth/me").expect(401);
	});
});
