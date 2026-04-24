// tests/unit/config/db.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Top‑level spy
const connectSpy = vi.fn();

// Top‑level mock, no top‑level variables inside
vi.mock("mongoose", () => {
	// Return a module where `connect` is a vi.fn() spy
	return {
		default: {
			connect: connectSpy,
		},
		connect: connectSpy,
	};
});

vi.mock("../../../src/config/env.js", () => ({
	ENV: {
		MONGO_URI: "mongodb://localhost:27017/testdb",
	},
}));

describe("connectDB", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
		(globalThis as any).mongoose = undefined;

		// Make sure the spy resolves cleanly
		connectSpy.mockResolvedValue({
			connection: { readyState: 1 },
		});
	});

	it("connects successfully and caches connection", async () => {
		const { connectDB } = await import("../../../src/config/db.js");
		const conn = await connectDB();

		// Expect the spy to have been called
		expect(connectSpy).toHaveBeenCalledWith("mongodb://localhost:27017/testdb", {
			maxPoolSize: 10,
		});

		// And `conn` should have a valid `connection`
		expect(conn.connection?.readyState).toBe(1);
	});

	it("reuses cached connection", async () => {
		const { connectDB } = await import("../../../src/config/db.js");

		const conn1 = await connectDB();
		const conn2 = await connectDB();

		// Same object, one call
		expect(conn1).toBe(conn2);
		expect(connectSpy).toHaveBeenCalledTimes(1);

		// Both have valid `connection`
		expect(conn1.connection?.readyState).toBe(1);
		expect(conn2.connection?.readyState).toBe(1);
	});
});
