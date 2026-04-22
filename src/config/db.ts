import "dotenv/config";
import mongoose from "mongoose";
import { ENV } from "./env.js";

const MONGO_URI = ENV.MONGO_URI;

if (!MONGO_URI) {
	throw new Error("❌ MONGO_URI is not set");
}

// Global cache (works in dev + prod)
let cached = global.mongoose;

if (!cached) {
	cached = global.mongoose = { conn: null, promise: null };
}

export async function connectDB() {
	if (cached.conn) {
		return cached.conn; // Reuse existing connection
	}

	if (!cached.promise) {
		cached.promise = mongoose
			.connect(MONGO_URI, {
				maxPoolSize: 10, // optional but recommended
			})
			.then((mongoose) => mongoose);
	}

	cached.conn = await cached.promise;
	return cached.conn;
}
