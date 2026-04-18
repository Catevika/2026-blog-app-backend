import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { ENV } from "./config/env.js";
import { RATE_LIMIT_MS } from "./config/rate-limit.js";
import { startServer } from "./config/startServer.js";
import authRouter from "./routes/auth.route.js";

const app = express();

app.use(cors({ origin: ENV.CORS_ORIGIN, credentials: true }));
app.use(rateLimit({ windowMs: RATE_LIMIT_MS, max: 200 }));

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
	res.json({
		status: "ok",
	});
});

app.use("/api/auth", authRouter);

if (ENV.NODE_ENV !== "test") {
	startServer().catch((err) => {
		console.error("Failed to start server:", err);
		process.exit(1);
	});
}

export default app;
