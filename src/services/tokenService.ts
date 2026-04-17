import type { Response } from "express";
import jwt from "jsonwebtoken";
import {
	ACCESS_COOKIE_NAME,
	ACCESS_TOKEN_EXPIRES_IN,
	ACCESS_TOKEN_MAX_AGE,
	ACCESS_TOKEN_SECRET,
	cookieBase as baseCookieOptions,
	REFRESH_COOKIE_NAME,
	REFRESH_TOKEN_EXPIRES_IN,
	REFRESH_TOKEN_MAX_AGE,
	REFRESH_TOKEN_SECRET,
} from "../config/authConfig";
import { RefreshToken } from "../models/RefreshToken";
import type { JwtPayload } from "../types";

// Re-export cookieBase so controllers can use tokenService.cookieBase
export const cookieBase = baseCookieOptions;

export const generateAccessToken = (userId: string): string =>
	jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

export const generateRefreshToken = (userId: string): string =>
	jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

export const verifyAccessToken = (token: string): JwtPayload =>
	jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
	jwt.verify(token, REFRESH_TOKEN_SECRET) as JwtPayload;

export const setTokens = async (res: Response, userId: string): Promise<void> => {
	const accessToken = generateAccessToken(userId);
	const refreshToken = generateRefreshToken(userId);

	await RefreshToken.create({
		token: refreshToken,
		userId,
		expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
		isValid: true,
	});

	// Access token cookie
	res.cookie(ACCESS_COOKIE_NAME, accessToken, {
		...cookieBase,
		maxAge: ACCESS_TOKEN_MAX_AGE,
		path: "/",
	});

	// Refresh token cookie — IMPORTANT: broad path
	res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
		...cookieBase,
		maxAge: REFRESH_TOKEN_MAX_AGE,
		path: "/",
	});
};

export const clearTokens = async (res: Response, refreshToken?: string): Promise<void> => {
	if (refreshToken) {
		await RefreshToken.findOneAndUpdate({ token: refreshToken }, { isValid: false }).exec();
	}

	res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
	res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
};
