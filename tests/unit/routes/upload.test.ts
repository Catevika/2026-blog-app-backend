import { PassThrough } from "node:stream";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUploadTestApp } from "../../helpers/createUploadTestApp.js";

const { uploadStreamMock } = vi.hoisted(() => ({
	uploadStreamMock: vi.fn(),
}));

vi.mock("cloudinary", () => ({
	v2: {
		config: vi.fn(),
		uploader: {
			upload_stream: uploadStreamMock,
		},
	},
}));

describe("image upload route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		uploadStreamMock.mockImplementation((_options, callback) => {
			const stream = new PassThrough();
			stream.on("finish", () => {
				callback(undefined, {
					public_id: "blog_uploads/test-image",
					secure_url: "https://res.cloudinary.com/example/image/upload/test-image.png",
					bytes: 16,
				});
			});
			return stream;
		});
	});

	it("streams validated images to Cloudinary v2 and returns the uploaded file metadata", async () => {
		const response = await request(createUploadTestApp())
			.post("/api/upload/image")
			.attach("image", Buffer.from("valid image data"), {
				filename: "test-image.png",
				contentType: "image/png",
			})
			.expect(200);

		expect(uploadStreamMock).toHaveBeenCalledWith(
			{
				folder: "blog_uploads",
				allowed_formats: ["jpg", "jpeg", "png", "webp"],
				transformation: [{ width: 1200, crop: "limit" }],
			},
			expect.any(Function),
		);
		expect(response.body).toEqual({
			success: true,
			data: {
				filename: "blog_uploads/test-image",
				url: "https://res.cloudinary.com/example/image/upload/test-image.png",
				duplicate: false,
			},
		});
	});

	it("rejects disallowed image extensions before calling Cloudinary", async () => {
		const response = await request(createUploadTestApp())
			.post("/api/upload/image")
			.attach("image", Buffer.from("not an image"), {
				filename: "test-image.gif",
				contentType: "image/gif",
			})
			.expect(400);

		expect(response.body).toEqual({
			success: false,
			message: "Only JPG, PNG, and WebP are allowed",
		});
		expect(uploadStreamMock).not.toHaveBeenCalled();
	});
});
