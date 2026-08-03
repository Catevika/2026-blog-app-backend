import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import * as tokenService from "../../src/services/tokenService.js";
import type { JwtPayload } from "../../src/types/index.js";
import { cookieBase } from "../../src/config/authConfig.js";

describe("tokenService (Unit)", () => {
	it("generates a valid access token", () => {
		const token = tokenService.generateAccessToken("123");
		const decoded = jwt.decode(token) as JwtPayload;

		expect(decoded.userId).toBe("123");
	});

	it("generates a valid refresh token (normal login)", () => {
		const token = tokenService.generateRefreshToken("456", false);
		const decoded = jwt.decode(token) as JwtPayload;

		expect(decoded.userId).toBe("456");
		expect(decoded.rememberMe).toBe(false);
	});

	it("generates a valid refresh token (remember me)", () => {
		const token = tokenService.generateRefreshToken("789", true);
		const decoded = jwt.decode(token) as JwtPayload;

		expect(decoded.userId).toBe("789");
		expect(decoded.rememberMe).toBe(true);
	});

	it("verifies a valid access token", () => {
		const token = tokenService.generateAccessToken("abc");
		const decoded = tokenService.verifyAccessToken(token);

		expect(decoded.userId).toBe("abc");
	});

	it("throws on invalid access token", () => {
		expect(() => tokenService.verifyAccessToken("invalid.token")).toThrow();
	});

	it("cookieBase contains correct defaults", () => {
		expect(cookieBase.httpOnly).toBe(true);

		// secure depends on NODE_ENV
		expect(typeof cookieBase.secure).toBe("boolean");

		// sameSite is "none" in production, "lax" otherwise
		expect(["none", "lax"]).toContain(cookieBase.sameSite);
	});
});
