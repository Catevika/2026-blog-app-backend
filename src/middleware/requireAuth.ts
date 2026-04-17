import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import * as cfg from "../config/authConfig.js";
import * as tokenService from "../services/tokenService.js";
import type { JwtPayload } from "../types/index.js";

/**
 * authenticateToken (optional)
 * - Attaches req.user when a valid access token exists.
 * - Does NOT block the request when token is missing or invalid.
 * - Useful for endpoints that behave differently for authenticated vs anonymous users.
 */
export const authenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
	const cookieName = cfg.ACCESS_COOKIE_NAME;
	const token = req.cookies?.[cookieName];

	if (typeof token !== "string") {
		// No token: continue as anonymous
		next();
		return;
	}

	try {
		const decoded = tokenService.verifyAccessToken(token) as JwtPayload;
		if (decoded?.userId) {
			req.user = { userId: decoded.userId };
		}
	} catch {
		// Ignore verification errors for optional auth
		// (do not attach req.user; continue as anonymous)
	} finally {
		next();
	}
};

/**
 * requireAuth (strict)
 * - Rejects requests without a valid access token.
 * - On success sets req.user and calls next().
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
	const cookieName = cfg.ACCESS_COOKIE_NAME;
	const token = req.cookies?.[cookieName];

	if (typeof token !== "string") {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	try {
		const decoded = tokenService.verifyAccessToken(token) as JwtPayload;

		if (!decoded?.userId) {
			res.status(401).json({ error: "Unauthorized" });
			return;
		}

		req.user = { userId: decoded.userId };
		next();
	} catch (err: unknown) {
		if (err instanceof jwt.TokenExpiredError) {
			res.status(401).json({ error: "Token expired" });
			return;
		}
		if (err instanceof jwt.JsonWebTokenError) {
			res.status(401).json({ error: "Invalid token" });
			return;
		}
		// Unexpected error: forward to global error handler
		next(err);
	}
};
