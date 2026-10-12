import type { Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { uploadImage } from "../middleware/uploadImage.js";

const router: Router = Router();

router.post("/image", uploadImage, async (req: Request, res: Response) => {
	try {
		const file = req.file;

		if (!file) {
			return res.status(400).json({ success: false, message: "No file uploaded" });
		}

		const permanentCloudUrl = file.path;
		const filename = file.filename;

		if (!permanentCloudUrl || !filename) {
			console.error("Cloudinary upload metadata is missing from the Multer file object:", file);
			return res.status(500).json({
				success: false,
				message: "Image was uploaded, but its Cloudinary metadata could not be retrieved.",
			});
		}

		return res.json({
			success: true,
			data: {
				filename: filename,
				url: permanentCloudUrl,
				duplicate: false,
			},
		});
	} catch (err) {
		console.error("Cloudinary upload route execution error:", err);
		return res.status(500).json({ success: false, message: "An error occurred during upload" });
	}
});

// Multer pipeline error configuration handler
router.use((err: unknown, _req: Request, res: Response, _next: unknown) => {
	console.error("❌ DETECTED BACKEND UPLOAD ERROR:", err);

	if (err instanceof multer.MulterError) {
		return res.status(400).json({ success: false, message: err.message });
	}

	if (err instanceof Error) {
		return res.status(500).json({ success: false, message: err.message });
	}

	return res.status(500).json({ success: false, message: "Upload operation failed" });
});

export default router;
