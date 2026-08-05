import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import { ENV } from "./config/env.js";
import { startServer } from "./config/startServer.js";
import authRouter from "./routes/auth.route.js";
import commentRouter from "./routes/comment.route.js";
import pdfRouter from "./routes/pdf.route.js";
import postRouter from "./routes/post.route.js";
import uploadRouter from "./routes/upload.route.js";

const app = express();

// REQUIRED when using Vite proxy, Nginx, Render, Railway, etc.
app.set("trust proxy", true);

const allowedOrigins = [
	ENV.CORS_ORIGIN,
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"https://2026-catevika-blog-frontend.vercel.app",
	"http://localhost:4173",
	"http://127.0.0.1:4173",
	"http://localhost:4000",
	"http://127.0.0.1:4000",
];

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) return callback(null, true);

			if (allowedOrigins.includes(origin) || ENV.NODE_ENV === "test") {
				callback(null, true);
			} else {
				callback(new Error(`Origin ${origin} blocked by CORS security layers.`));
			}
		},
		credentials: true,
	}),
);

app.options("*splat", cors());

// Raise body parser limit constraints to prevent '413 Payload Too Large'
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cookieParser());

// API Endpoints
app.use("/api/upload", uploadRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/auth", authRouter);
app.use("/api/posts", postRouter);
app.use("/api/posts/:postId/comments", commentRouter);

// Health Check for Render deployment monitoring
app.get("/api/health", (_req, res) => {
	res.json({
		status: "ok",
	});
});

if (ENV.NODE_ENV !== "test") {
	try {
		startServer();
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

export default app;
