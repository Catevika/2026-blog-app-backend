import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs/promises";
import { storeImageAtomic } from "../../../src/utils/imageStore.js";

// COMPLETE fs mock
vi.mock("node:fs/promises", () => ({
	default: {
		readFile: vi.fn(),
		writeFile: vi.fn(),
		mkdir: vi.fn(),
		stat: vi.fn(),
		access: vi.fn(),
		rename: vi.fn(),
		unlink: vi.fn(),
	},
}));

describe("storeImageAtomic", () => {
	beforeEach(() => vi.clearAllMocks());

	it("stores a new image and updates hashes", async () => {
		const buf = Buffer.from("abc");

		// .hashes.json initially empty
		vi.mocked(fs.readFile).mockResolvedValue("{}");

		// file does not exist yet
		vi.mocked(fs.access).mockRejectedValue(new Error("not found"));

		const result = await storeImageAtomic(buf, "test.png");

		expect(result.filename.endsWith(".png")).toBe(true);
		expect(result.duplicate).toBe(false);

		// 1) write image file
		// 2) write .hashes.json.tmp
		// 3) rename tmp → .hashes.json
		expect(fs.writeFile).toHaveBeenCalledTimes(2);
		expect(fs.rename).toHaveBeenCalledTimes(1);
	});

	it("detects duplicate image", async () => {
		const buf = Buffer.from("abc");

		// REAL SHA-256 hash of "abc"
		const sha256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

		vi.mocked(fs.readFile).mockResolvedValue(
			JSON.stringify({
				[sha256]: {
					filename: "existing.png",
					createdAt: new Date().toISOString(),
				},
			}),
		);

		const result = await storeImageAtomic(buf, "test.png");

		expect(result.filename).toBe("existing.png");
		expect(result.duplicate).toBe(true);

		// duplicate → no writes
		expect(fs.writeFile).not.toHaveBeenCalled();
		expect(fs.rename).not.toHaveBeenCalled();
	});
});
