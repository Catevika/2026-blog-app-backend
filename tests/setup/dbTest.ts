process.env.NODE_ENV = process.env.NODE_ENV ?? testConfig.NODE_ENV;
process.env.ACCESS_TOKEN_SECRET =
	process.env.ACCESS_TOKEN_SECRET ?? testConfig.ACCESS_TOKEN_SECRET;
process.env.REFRESH_TOKEN_SECRET =
	process.env.REFRESH_TOKEN_SECRET ?? testConfig.REFRESH_TOKEN_SECRET;
process.env.REFRESH_TOKEN_SECRET =
	process.env.REFRESH_TOKEN_SECRET ?? testConfig.REFRESH_TOKEN_SECRET;
process.env.ROTATE_REFRESH_TOKENS =
	process.env.ROTATE_REFRESH_TOKENS ?? testConfig.ROTATE_REFRESH_TOKENS;

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { testConfig } from "./test-config.js";

let mongo: MongoMemoryServer;

beforeAll(async () => {
	mongo = await MongoMemoryServer.create();
	const uri = mongo.getUri();

	// Connect BEFORE any test imports app
	await mongoose.connect(uri, {
		dbName: "test",
	});
});

beforeEach(async () => {
	if (mongoose.connection.readyState !== 1) return;

	const db = mongoose.connection.db;
	if (!db) return;

	const collections = await db.collections();
	for (const collection of collections) {
		await collection.deleteMany({});
	}
});

afterAll(async () => {
	await mongoose.disconnect();
	await mongo.stop();
});
