import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

// --------------------------------------------------
// Mock utils BEFORE importing anything
// --------------------------------------------------
vi.mock("../../../src/utils/imageValidator.js", () => ({
	validateMagicBytes: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
	readFile: vi.fn(),
	unlink: vi.fn().mockResolvedValue(undefined),
}));

// --------------------------------------------------
// Imports AFTER mocks
// --------------------------------------------------
import { validateMagicBytes } from "../../../src/utils/imageValidator.js";
import { createUploadTestApp } from "../../helpers/createUploadTestApp.js";

// --------------------------------------------------
// Test Suite
// --------------------------------------------------
describe("POST /api/upload/image (integration)", () => {
	const endpoint = "/api/upload/image";
	let app: Express;

	beforeEach(() => {
		app = createUploadTestApp();
		vi.clearAllMocks();
	});

	it("400 when no file uploaded", async () => {
		const res = await request(app).post(endpoint).expect(400);

		expect(res.body.success).toBe(false);
		expect(res.body.message).toBe("No file uploaded");
	});

	it("400 when magic bytes invalid", async () => {
		(validateMagicBytes as any).mockReturnValue({
			valid: false,
			reason: "Only JPG and PNG under 5242880 are allowed",
		});

		const res = await request(app)
			.post(endpoint)
			.attach("image", Buffer.from("not-an-image-at-all"), "test.bin")
			.expect(400);

		expect(res.body.success).toBe(false);
		expect(res.body.message).toBe("Only JPG and PNG under 5242880 are allowed");
	});

	it("200 on valid upload (duplicate allowed)", async () => {
		(validateMagicBytes as any).mockReturnValue({ valid: true });

		const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00]);

		const res = await request(app)
			.post(endpoint)
			.attach("image", jpegBuffer, "photo.jpg")
			.expect(200);

		expect(res.body.data.filename).toMatch(/^[a-f0-9]+\.jpg$/);

		// IMPORTANT:
		// The backend may return duplicate: true if the hash already exists.
		expect(typeof res.body.data.duplicate).toBe("boolean");

		expect(res.body.data.url).toContain(`/uploads/images/${res.body.data.filename}`);
	});

	it("handles Multer file size error", async () => {
		const oversizedBuffer = Buffer.alloc(5242881, 0x00);

		const res = await request(app)
			.post(endpoint)
			.attach("image", oversizedBuffer, "big.jpg")
			.expect(400);

		expect(res.body.success).toBe(false);
		expect(res.body.message).toBe("File too large");
	});
});
