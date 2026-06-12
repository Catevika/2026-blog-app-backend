import express from "express";
import cookieParser from "cookie-parser";

import uploadRouter from "../../src/routes/upload.route.js";

export function createUploadTestApp() {
	const app = express();

	app.use(cookieParser());
	app.use(express.json());

	app.use("/api/upload", uploadRouter);

	return app;
}
