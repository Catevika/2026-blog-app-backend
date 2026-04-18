import type { Error as MongooseError } from "mongoose";
import { describe, expect, it } from "vitest";
import { User } from "../../../src/models/User.js";

// Type guard for Mongoose ValidationError
function isValidationError(err: unknown): err is MongooseError.ValidationError {
	return (
		typeof err === "object" &&
		err !== null &&
		"name" in err &&
		(err as { name: string }).name === "ValidationError"
	);
}

describe("User model", () => {
	it("requires email", async () => {
		try {
			await User.create({ name: "Test", passwordHash: "abc" });
			throw new Error("Expected validation error but none was thrown");
		} catch (err: unknown) {
			expect(isValidationError(err)).toBe(true);
			expect(err && isValidationError(err) && err.errors.email).toBeDefined();
		}
	});

	it("requires passwordHash", async () => {
		try {
			await User.create({ email: "x@test.com", name: "Test" });
			throw new Error("Expected validation error but none was thrown");
		} catch (err: unknown) {
			expect(isValidationError(err)).toBe(true);
			expect(err && isValidationError(err) && err.errors.passwordHash).toBeDefined();
		}
	});

	it("creates a valid user", async () => {
		const user = await User.create({
			email: "valid@test.com",
			name: "Valid",
			passwordHash: "hashed",
			role: "user",
		});

		expect(user.email).toBe("valid@test.com");
	});
});
