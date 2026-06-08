import type { Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import fs from "node:fs/promises";
import { uploadImage } from "../middleware/uploadImage.js";
import { storeImageAtomic } from "../utils/imageStore.js";
import { validateMagicBytes } from "../utils/imageValidator.js";

const router: Router = Router();

router.post("/image", uploadImage, async (req: Request, res: Response) => {
	const base = `${req.protocol}://${req.get("host")}`;

	const file = (req as Request & { file?: Express.Multer.File }).file;
	if (!file) {
		return res
			.status(400)
			.json({ success: false, message: "No file uploaded" });
	}

	const tempPath = file.path;

	try {
		const buffer = await fs.readFile(tempPath);

		const validation = validateMagicBytes(buffer);
		if (!validation.valid) {
			await fs.unlink(tempPath).catch(() => {});
			return res
				.status(400)
				.json({ success: false, message: validation.reason });
		}

		const result = await storeImageAtomic(buffer, file.originalname);

		await fs.unlink(tempPath).catch(() => {});

		return res.json({
			success: true,
			data: {
				filename: result.filename,
				url: `${base}/uploads/images/${result.filename}`,
				duplicate: result.duplicate,
			},
		});
	} catch (err) {
		console.error("Upload error:", err);
		if (typeof tempPath === "string") await fs.unlink(tempPath).catch(() => {});
		return res
			.status(500)
			.json({ success: false, message: "An error occurred" });
	}
});

// Multer / upload error handler
router.use((err: unknown, _req: Request, res: Response, _next: unknown) => {
	if (err instanceof multer.MulterError) {
		return res.status(400).json({ success: false, message: err.message });
	}
	if (err instanceof Error) {
		const msg = err.message.toLowerCase();
		if (
			msg.includes("invalid") ||
			msg.includes("file") ||
			msg.includes("extension")
		) {
			return res.status(400).json({ success: false, message: err.message });
		}
	}
	return res.status(500).json({ success: false, message: "Upload failed" });
});

export default router;
