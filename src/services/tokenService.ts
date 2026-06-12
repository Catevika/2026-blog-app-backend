import type { Response } from "express";
import jwt from "jsonwebtoken";
import {
	ACCESS_COOKIE_NAME,
	REFRESH_COOKIE_NAME,
	ACCESS_TOKEN_SECRET,
	REFRESH_TOKEN_SECRET,
	ACCESS_TOKEN_MAX_AGE,
	REFRESH_TOKEN_MAX_AGE,
	REFRESH_TOKEN_MAX_AGE_REMEMBER,
	cookieBase,
} from "../config/authConfig.js";
import { RefreshToken } from "../models/RefreshToken.js";
import type { JwtPayload } from "../types/index.js";

export function generateAccessToken(userId: string): string {
	return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, {
		expiresIn: ACCESS_TOKEN_MAX_AGE / 1000,
	});
}

export function generateRefreshToken(userId: string, rememberMe: boolean): string {
	const maxAge = rememberMe ? REFRESH_TOKEN_MAX_AGE_REMEMBER : REFRESH_TOKEN_MAX_AGE;
	return jwt.sign({ userId, rememberMe }, REFRESH_TOKEN_SECRET, {
		expiresIn: maxAge / 1000,
	});
}

export const verifyAccessToken = (token: string): JwtPayload =>
	jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;

export function verifyRefreshToken(token: string): { userId: string; rememberMe: boolean } {
	return jwt.verify(token, REFRESH_TOKEN_SECRET) as { userId: string; rememberMe: boolean };
}

export async function setTokens(res: Response, userId: string, rememberMe: boolean): Promise<void> {
	const accessToken = generateAccessToken(userId);
	const refreshToken = generateRefreshToken(userId, rememberMe);

	const expiresAt = new Date(
		Date.now() + (rememberMe ? REFRESH_TOKEN_MAX_AGE_REMEMBER : REFRESH_TOKEN_MAX_AGE),
	);

	await RefreshToken.create({
		token: refreshToken,
		userId,
		rememberMe,
		expiresAt,
		isValid: true,
	});

	res.cookie(ACCESS_COOKIE_NAME, accessToken, {
		...cookieBase,
		maxAge: ACCESS_TOKEN_MAX_AGE,
		path: "/",
	});

	res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
		...cookieBase,
		maxAge: rememberMe ? REFRESH_TOKEN_MAX_AGE_REMEMBER : REFRESH_TOKEN_MAX_AGE,
		path: "/",
	});
}

export async function clearTokens(res: Response, refreshToken?: string): Promise<void> {
	if (refreshToken) {
		await RefreshToken.updateMany({ token: refreshToken }, { isValid: false }).exec();
	}

	res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
	res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
}
