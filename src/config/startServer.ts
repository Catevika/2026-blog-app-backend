import app from "../server.js";
import { connectDB } from "./db.js";
import { ENV } from "./env.js";

export async function startServer(): Promise<void> {
	const db = await connectDB();

	if (db.connection.readyState !== 1) {
		throw new Error("Failed to connect to the database");
	}

	console.log("✅ DB connected");


	const port = Number(ENV.PORT ?? "4000");
	app.listen(port, () => {
		console.log(`🚀 Backend listening on http://localhost:${port}`);
	});
}
