import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import path from "node:path";
import { ENV } from "./config/env.js";
import { startServer } from "./config/startServer.js";
import authRouter from "./routes/auth.route.js";
import commentRouter from "./routes/comment.route.js";
import pdfRouter from "./routes/pdf.route.js";
import postRouter from "./routes/post.route.js";
import uploadRouter from "./routes/upload.route.js";

const app = express();

// 🚀 CONFIGURATION CORS DYNAMIQUE ET SÉCURISÉE
const allowedOrigins = [
	ENV.CORS_ORIGIN, // Votre domaine de production (ex: Vercel)
	"http://localhost:5173", // Développement local standard
	"http://127.0.0.1:5173", // Alternative loopback local
	"http://localhost:4173", // Aperçu (preview) de production en local
	"http://127.0.0.1:4173", // 🎯 Requis pour le runner Playwright sur GitHub Actions
];

app.use(
	cors({
		origin: (origin, callback) => {
			// Autoriser les requêtes sans origine (comme curl, Postman ou les tâches internes)
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

app.use(express.json());

// REQUIRED when using Vite proxy, Nginx, Render, Railway, etc.
app.set("trust proxy", true);

app.use(cookieParser());

app.use("/api/upload", uploadRouter);

app.use(express.static(path.join(process.cwd(), "public")));
app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

app.use("/api/pdf", pdfRouter);

app.get("/api/health", (_req, res) => {
	res.json({
		status: "ok",
	});
});

app.use("/api/auth", authRouter);
app.use("/api/posts", postRouter);
app.use("/api/posts/:postId/comments", commentRouter);

if (ENV.NODE_ENV !== "test") {
	try {
		startServer();
	} catch (error) {
		console.error("Failed to start server:", error);
		process.exit(1);
	}
}

export default app;
