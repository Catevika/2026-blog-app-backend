import { describe, it, expect } from "vitest";
import { validateMagicBytes } from "../../../src/utils/imageValidator.js";

describe("validateMagicBytes", () => {
	it("accepts valid PNG", () => {
		const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const result = validateMagicBytes(png);
		expect(result.valid).toBe(true);
	});

	it("accepts valid JPG", () => {
		// Must be at least 4 bytes or validator rejects it
		const jpg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
		const result = validateMagicBytes(jpg);
		expect(result.valid).toBe(true);
	});

	it("rejects invalid file", () => {
		const buf = Buffer.from([0x00, 0x11, 0x22, 0x33]);
		const result = validateMagicBytes(buf);
		expect(result.valid).toBe(false);
		expect(result.reason).toBe("Invalid image file (unsupported format or corrupted)");
	});

	it("rejects empty buffer", () => {
		const result = validateMagicBytes(Buffer.from([]));
		expect(result.valid).toBe(false);
		expect(result.reason).toBe("File too small or empty");
	});
});
