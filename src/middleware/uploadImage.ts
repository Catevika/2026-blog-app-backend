import { v2 as cloudinary } from "cloudinary";
import multer, { MulterError } from "multer";
import path from "node:path";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from "../config/upload.js";

cloudinary.config({
	cloud_name: process.env["CLOUDINARY_CLOUD_NAME"],
	api_key: process.env["CLOUDINARY_API_KEY"],
	api_secret: process.env["CLOUDINARY_API_SECRET"],
});

const storage: multer.StorageEngine = {
	_handleFile(_req, file, callback) {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "blog_uploads",
				allowed_formats: ["jpg", "jpeg", "png", "webp"],
				transformation: [{ width: 1200, crop: "limit" }],
			},
			(error, result) => {
				if (error) {
					callback(error);
					return;
				}

				if (!result) {
					callback(new Error("Cloudinary returned no upload result"));
					return;
				}

				callback(null, {
					filename: result.public_id,
					path: result.secure_url,
					size: result.bytes,
				});
			},
		);

		file.stream.pipe(uploadStream);
	},

	_removeFile(_req, file, callback) {
		if (!file.filename) {
			callback(new Error("Cannot remove Cloudinary upload without a public ID"));
			return;
		}

		void cloudinary.uploader
			.destroy(file.filename, { invalidate: true, resource_type: "image" })
			.then((result) => {
				if (result.result !== "ok" && result.result !== "not found") {
					callback(new Error(`Cloudinary failed to remove upload: ${result.result}`));
					return;
				}

				callback(null);
			})
			.catch((error: unknown) => {
				callback(error instanceof Error ? error : new Error(String(error)));
			});
	},
};

const fileFilter = (
	_req: Express.Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback,
) => {
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
