import { beforeEach, describe, expect, it, vi } from "vitest";

describe("server.ts", () => {
	beforeEach(() => {
		vi.resetModules();
		process.env.NODE_ENV = "test";
	});

	it("does not call startServer when NODE_ENV === 'test'", async () => {
		const startSpy = vi.fn();

		vi.doMock("../../src/startServer.js", () => ({
			startServer: startSpy,
		}));

		await import("../../src/server.js");

		expect(startSpy).not.toHaveBeenCalled();
	});
});
