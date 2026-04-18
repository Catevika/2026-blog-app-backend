import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { wrapAsync } from "../../src/utils/wrapAsync.js";

// Minimal typed stubs — enough for the middleware signature
const req = {} as Request;
const res = {} as Response;

describe("wrapAsync (Unit)", () => {
	it("calls next with error when async throws", async () => {
		const error = new Error("Boom");

		const handler = wrapAsync(async () => {
			throw error;
		});

		const next: NextFunction = vi.fn();

		await handler(req, res, next);

		expect(next).toHaveBeenCalledWith(error);
	});

	it("calls handler normally when no error", async () => {
		const fn = vi.fn();

		const handler = wrapAsync(async () => fn());

		const next: NextFunction = vi.fn();

		await handler(req, res, next);

		expect(fn).toHaveBeenCalled();
		expect(next).not.toHaveBeenCalled();
	});
});
