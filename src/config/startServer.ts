import app from "../server.js";
import { connectDB } from "./db.js";
import { ENV } from "./env.js";

export async function startServer(): Promise<void> {
	await connectDB();

	const port = Number(ENV.PORT ?? "4000");
	app.listen(port, () => {
		console.log(`🚀 Backend listening on http://localhost:${port}`);
	});
}
