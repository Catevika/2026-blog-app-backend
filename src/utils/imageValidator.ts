export function validateMagicBytes(buffer: Buffer): { valid: boolean; reason?: string } {
	if (!buffer || buffer.length < 4) {
		return { valid: false, reason: "File too small or empty" };
	}

	// PNG signature (8 bytes)
	const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	if (buffer.subarray(0, 8).equals(pngSig)) {
		return { valid: true };
	}

	// JPEG signature (first 3 bytes)
	if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return { valid: true };
	}

	return { valid: false, reason: "Invalid image file (unsupported format or corrupted)" };
}
