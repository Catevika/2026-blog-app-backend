import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import * as tokenService from "../../src/services/tokenService.js";
import type { JwtPayload } from "../../src/types/index.js";

describe("tokenService (Unit)", () => {
	it("generates a valid access token", () => {
		const token = tokenService.generateAccessToken("123");
		const decoded = jwt.decode(token) as JwtPayload;

		expect(decoded.userId).toBe("123");
	});

	it("generates a valid refresh token", () => {
		const token = tokenService.generateRefreshToken("456");
		const decoded = jwt.decode(token) as JwtPayload;

		expect(decoded.userId).toBe("456");
	});

	it("verifies a valid access token", () => {
		const token = tokenService.generateAccessToken("789");
		const decoded = tokenService.verifyAccessToken(token);

		expect(decoded.userId).toBe("789");
	});

	it("throws on invalid access token", () => {
		expect(() => tokenService.verifyAccessToken("invalid.token")).toThrow();
	});

	it("cookieBase contains correct defaults", () => {
		expect(tokenService.cookieBase.httpOnly).toBe(true);
		expect(tokenService.cookieBase.secure).toBe(false);
		expect(tokenService.cookieBase.sameSite).toBe("lax");
	});
});
