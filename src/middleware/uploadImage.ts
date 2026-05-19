import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import multer, { MulterError } from "multer";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "../constants/index.js";

const TMP_UPLOADS = path.join(process.cwd(), "tmp", "uploads", "images");

// Ensure tmp dir exists at startup
try {
	fs.mkdirSync(TMP_UPLOADS, { recursive: true });
} catch (err) {
	console.error("Failed to create tmp upload directory", err);
	throw err;
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, TMP_UPLOADS),
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
		const randomName = crypto.randomBytes(16).toString("hex");
		cb(null, `${randomName}${ext}`);
	},
});

const fileFilter = (
	_req: Express.Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (!/^image\/(jpe?g|png)$/i.test(file.mimetype)) {
		const err = new MulterError("LIMIT_UNEXPECTED_FILE");
		err.message = "Only JPG and PNG allowed";
		return cb(err);
	}
	const ext = path.extname(file.originalname || "").toLowerCase();
	if (!ALLOWED_EXTENSIONS.includes(ext)) {
		const err = new MulterError("LIMIT_UNEXPECTED_FILE");
		err.message = "Invalid file extension";
		return cb(err);
	}
	cb(null, true);
};

export const uploadImage: RequestHandler = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_FILE_SIZE },
}).single("image");
