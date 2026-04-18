import { beforeEach, describe, expect, it, vi } from "vitest";

describe("startServer()", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("calls app.listen after connectDB", async () => {
		const listenSpy = vi.fn();
		const connectSpy = vi.fn().mockResolvedValue(undefined);

		vi.doMock("../../src/config/db.js", () => ({
			connectDB: connectSpy,
		}));

		vi.doMock("../../src/server.js", () => ({
			default: { listen: listenSpy },
		}));

		const { startServer } = await import("../../src/config/startServer.js");

		await startServer();

		expect(connectSpy).toHaveBeenCalled();
		expect(listenSpy).toHaveBeenCalled();
	});
});
