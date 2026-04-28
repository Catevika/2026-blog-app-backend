import { beforeEach, describe, expect, it, vi } from "vitest";

const connectSpy = vi.fn();

vi.mock("mongoose", () => {
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

		connectSpy.mockResolvedValue({
			connection: { readyState: 1 },
		});
	});

	it("connects successfully and caches connection", async () => {
		const { connectDB } = await import("../../../src/config/db.js");
		const conn = await connectDB();

		expect(connectSpy).toHaveBeenCalledWith(
			"mongodb://localhost:27017/testdb",
			{
				maxPoolSize: 10,
			}
		);

		expect(conn.connection?.readyState).toBe(1);
	});

	it("reuses cached connection", async () => {
		const { connectDB } = await import("../../../src/config/db.js");

		const conn1 = await connectDB();
		const conn2 = await connectDB();

		expect(conn1).toBe(conn2);
		expect(connectSpy).toHaveBeenCalledTimes(1);

		expect(conn1.connection?.readyState).toBe(1);
		expect(conn2.connection?.readyState).toBe(1);
	});
});
