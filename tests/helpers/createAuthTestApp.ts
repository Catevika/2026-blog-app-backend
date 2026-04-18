import cookieParser from "cookie-parser";
import express, { type Express } from "express";
import authRoutes from "../../src/routes/auth.route.js";

export function createAuthTestApp(): Express {
	const app = express();
	app.use(express.json());
	app.use(cookieParser());
	app.use("/api/auth", authRoutes);
	return app;
}
