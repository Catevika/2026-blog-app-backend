import type { Request } from "express";
import { Router } from "express";
import { Types } from "mongoose";
import type { Browser } from "puppeteer";
import { Post } from "../models/Post.js";
import * as browserService from "../services/browserService.js";
import type { PdfRequestBody } from "../types/index.js";
import { authenticateToken } from "../middleware/requireAuth.js";

const router: Router = Router();

// ---------------------------------------------------------
//   POST /api/pdf  (PUBLIC for published posts)
// ---------------------------------------------------------
router.post("/", authenticateToken, async (req, res) => {
	const requestBody: PdfRequestBody = req.body;

	const { postId, title } = requestBody;

	// Validate postId
	if (!postId || !Types.ObjectId.isValid(postId)) {
		return res.status(400).json({ message: "Valid post ID is required" });
	}

	// Fetch post
	const post = await Post.findById(postId).populate("author", "name email").lean().exec();

	if (!post) {
		return res.status(404).json({ message: "Post not found" });
	}

	// Deleted posts cannot be exported
	if (post.deleted) {
		return res.status(410).json({ message: "Post deleted" });
	}

	// Drafts require authentication
	const isDraft = post.status === "draft";
	const isAuthor =
		typeof (req as Request).user !== "undefined" &&
		post.author?._id?.toString() === (req as Request).user?.userId;

	if (isDraft && !isAuthor) {
		return res.status(403).json({ message: "Not authorized to export this post" });
	}

	// Prepare filename
	const rawTitle = title || `post_${postId}`;
	const sanitized = rawTitle.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
	const truncated = sanitized.slice(0, 100) || `post_${postId}`;
	const filename = `${truncated}.pdf`;

	// Puppeteer PDF generation
	let browser: Browser | null = null;

	try {
		// Use the wrapper so tests can mock createBrowser
		browser = await browserService.createBrowser();

		const page = await browser.newPage();

		// Pass postId to frontend
		await page.setExtraHTTPHeaders({
			"x-export-post-id": postId.toString(),
		});

		await page.setViewport({ width: 1280, height: 900 });

		// Load your frontend export page
		await page.goto(`http://localhost:5173/export/${postId}`, {
			waitUntil: "networkidle0",
			timeout: 15000,
		});

		// Ensure frontend loaded
		const ok = (await page.$("#export-ready")) !== null;

		if (!ok) {
			throw new Error("frontend-not-ready");
		}

		const pdfBuffer = await page.pdf({
			format: "A4",
			printBackground: true,
		});

		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

		return res.send(pdfBuffer);
	} catch (err: unknown) {
		// Safe message extraction
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes("timeout")) {
			return res.status(504).json({
				message: "PDF rendering timed out - page too complex",
			});
		}

		console.error("PDF generation failed:", err);
		return res.status(500).json({
			message: "Failed to generate PDF",
		});
	} finally {
		if (browser) {
			await browser.close().catch(() => {});
		}
	}
});

export default router;
