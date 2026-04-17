import "dotenv/config";
import mongoose from "mongoose";
import { ENV } from "./env";

const MONGO_URI = ENV.MONGO_URI ?? "";

export async function connectDB() {
	if (!MONGO_URI) throw new Error("MONGO_URI is not set");

	await mongoose.connect(MONGO_URI);
	console.log("✅ Connected to MongoDB");
}
