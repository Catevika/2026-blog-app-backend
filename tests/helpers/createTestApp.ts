import cookieParser from "cookie-parser";
import express, { type Express, type RequestHandler } from "express";

export function createTestApp(routeHandler: RequestHandler): Express {
	const app = express();
	app.use(cookieParser());

	app.get("/test", routeHandler, (_req, res) => {
		res.json({ ok: true });
	});

	return app;
}
