import { v2 as cloudinary } from "cloudinary";
import pkg from "multer-storage-cloudinary";
import multer, { MulterError } from "multer";
import path from "node:path";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "../config/upload.js";

// Safe cross-boundary fallback extractor for old module structures
const CloudinaryStorage = (pkg as any).CloudinaryStorage || pkg;

// Initialize Cloudinary credentials safely using your local environment variables
cloudinary.config({
	cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
	api_key: process.env["CLOUDINARY_API_KEY"],
	api_secret: process.env["CLOUDINARY_API_SECRET"],
});

const storage = new CloudinaryStorage({
	cloudinary: {
		v2: cloudinary,
		uploader: cloudinary.uploader, // Fallback chain helper
	} as any,
	params: {
		folder: "blog_uploads",
		allowedFormats: ["jpg", "jpeg", "png", "webp"],
		transformation: [{ width: 1200, crop: "limit" }],
	},
});

// Security validation layer utilizing your updated config variables
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (!/^image\/(jpe?g|png|webp)$/i.test(file.mimetype)) {
		const err = new MulterError("LIMIT_UNEXPECTED_FILE");
		err.message = "Only JPG, PNG, and WebP are allowed";
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

export const uploadImage = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_FILE_SIZE },
}).single("image");

export default uploadImage;
