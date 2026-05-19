import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { ENV } from "./config/env.js";
import { startServer } from "./config/startServer.js";
import authRouter from "./routes/auth.route.js";
import postRouter from "./routes/post.route.js";
import uploadRouter from "./routes/upload.route.js";
import path from "node:path";

const app = express();

app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.use("/api/upload", uploadRouter);

app.use(express.static(path.join(process.cwd(), "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

app.get("/health", (_req, res) => {
	res.json({
		status: "ok",
	});
});

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouter);

if (ENV.NODE_ENV !== "test") {
	try {
		startServer();
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

export default app;
