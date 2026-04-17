import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { connectDB } from "./config/db";
import { ENV } from "./config/env";
import { RATE_LIMIT_MS } from "./config/rate-limit";
import authRouter from "./routes/auth.route";

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

async function start(): Promise<void> {
	await connectDB();

	const port = Number(ENV.PORT ?? "4000");
	app.listen(port, () => {
		console.log(`🚀 Backend listening on http://localhost:${port}`);
	});
}

if (ENV.NODE_ENV !== "test") {
	start().catch((err) => {
		console.error("Failed to start server:", err);
		process.exit(1);
	});
}

export default app;
