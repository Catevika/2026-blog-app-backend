import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// TODO: routes will go here

async function start() {
  await connectDB();
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Backend listening on http://localhost:${process.env.PORT}`);
  });
  }

if (process.env.NODE_ENV !== "test") {
  start();

  start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
  }

