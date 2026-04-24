/// <reference types="node" />
import { describe, expect, it } from "vitest";
import { ENV } from "../../../src/config/env.js";

describe("ENV getters", () => {
	it("returns the actual VITEST env var", () => {
		expect(ENV.VITEST).toBe(process.env.VITEST);
	});

	it("returns default values when env vars are missing", () => {
		delete process.env.PORT;
		expect(ENV.PORT).toBe("3000");
	});

	it("returns overridden values", () => {
		process.env.PORT = "9999";
		expect(ENV.PORT).toBe("9999");
	});
});
