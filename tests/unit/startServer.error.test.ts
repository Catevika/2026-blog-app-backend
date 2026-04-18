import { beforeEach, describe, expect, it, vi } from "vitest";

describe("startServer() error handling", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("throws when connectDB fails", async () => {
		const error = new Error("DB failed");

		vi.doMock("../../src/config/db.js", () => ({
			connectDB: vi.fn().mockRejectedValue(error),
		}));

		vi.doMock("../../src/server.js", () => ({
			default: { listen: vi.fn() },
		}));

		const { startServer } = await import("../../src/config/startServer.js");

		await expect(startServer()).rejects.toThrow("DB failed");
	});
});
