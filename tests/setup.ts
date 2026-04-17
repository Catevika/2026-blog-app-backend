import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";
import app from "../src/server";

let mongo: MongoMemoryServer;

beforeAll(async () => {
	mongo = await MongoMemoryServer.create();
	const uri = mongo.getUri();

	await mongoose.connect(uri);
});

afterEach(async () => {
	const collections = await mongoose.connection.db?.collections();
	if (!collections) throw new Error("No collections found");
	for (const collection of collections) {
		await collection.deleteMany({});
	}
});

afterAll(async () => {
	await mongoose.connection.close();
	await mongo.stop();
});

export { app };
