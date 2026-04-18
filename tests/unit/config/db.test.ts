import mongoose from "mongoose";
import { describe, expect, it, vi } from "vitest";
import { connectDB } from "../../../src/config/db.js";
import { ENV } from "../../../src/config/env.js";

vi.mock("mongoose", () => ({
	default: {
		connect: vi.fn(),
	},
}));

describe("connectDB", () => {
	it("calls mongoose.connect with MONGO_URI", async () => {
		await connectDB();
		expect(mongoose.connect).toHaveBeenCalledWith(ENV.MONGO_URI);
	});
});
