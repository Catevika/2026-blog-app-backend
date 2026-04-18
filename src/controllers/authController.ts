import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import {
	ACCESS_COOKIE_NAME,
	ACCESS_TOKEN_MAX_AGE,
	REFRESH_COOKIE_NAME,
	REFRESH_TOKEN_MAX_AGE,
} from "../config/authConfig.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { User } from "../models/User.js";
import * as tokenService from "../services/tokenService.js";
import { wrapAsync } from "../utils/wrapAsync.js";

export const signup = wrapAsync(async (req: Request, res: Response) => {
	const { email, password, name } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "Email and password are required" });
	}

	const existing = await User.findOne({ email }).lean().exec();
	if (existing) {
		return res.status(409).json({ message: "Email already exists" });
	}

	const passwordHash = await bcrypt.hash(password, 12);

	const user = await User.create({ email, name, passwordHash, role: "user" });

	await tokenService.setTokens(res, user._id.toString());

	return res.status(201).json({
		user: {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			role: user.role,
		},
	});
});

export const login = wrapAsync(async (req: Request, res: Response) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ message: "Email and password are required" });
	}

	const user = await User.findOne({ email }).lean().exec();
	if (!user) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	const valid = await bcrypt.compare(password, user.passwordHash);
	if (!valid) {
		return res.status(401).json({ message: "Invalid credentials" });
	}

	await tokenService.setTokens(res, user._id.toString());

	return res.json({
		user: {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			role: user.role,
		},
	});
});

export const logout = wrapAsync(async (req: Request, res: Response) => {
	const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
	await tokenService.clearTokens(res, refreshToken);
	return res.status(200).json({ message: "Logout successful" });
});

export const refresh = wrapAsync(async (req: Request, res: Response) => {
	const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

	if (!refreshToken) {
		return res.status(401).json({ message: "Refresh token missing" });
	}

	const dbToken = await RefreshToken.findOne({
		token: refreshToken,
		isValid: true,
		expiresAt: { $gt: new Date() },
	})
		.lean()
		.exec();

	if (!dbToken) {
		return res.status(401).json({ message: "Invalid refresh token" });
	}

	const decoded = tokenService.verifyRefreshToken(refreshToken);
	const userId = decoded.userId;

	await RefreshToken.findByIdAndUpdate(dbToken._id, { isValid: false }).exec();

	const newRefreshToken = tokenService.generateRefreshToken(userId);
	await RefreshToken.create({
		token: newRefreshToken,
		userId,
		expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE),
		isValid: true,
	});

	const newAccessToken = tokenService.generateAccessToken(userId);

	res.cookie(ACCESS_COOKIE_NAME, newAccessToken, {
		...tokenService.cookieBase,
		maxAge: ACCESS_TOKEN_MAX_AGE,
		path: "/",
	});

	res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, {
		...tokenService.cookieBase,
		maxAge: REFRESH_TOKEN_MAX_AGE,
		path: "/",
	});

	const user = await User.findById(userId).select("email name role").lean().exec();
	if (!user) {
		return res.status(401).json({ message: "User not found" });
	}

	return res.json({
		user: {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			role: user.role,
		},
	});
});

export const verify = wrapAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const user = await User.findById(userId).select("email name role").lean().exec();

	if (!user) {
		return res.status(401).json({ message: "User not found" });
	}

	return res.json({
		user: {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			role: user.role,
		},
	});
});

export const me = wrapAsync(async (req: Request, res: Response) => {
	const userId = req.user?.userId;

	if (!userId) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	const user = await User.findById(userId).lean().exec();

	if (!user) {
		return res.status(401).json({ message: "Unauthorized" });
	}

	return res.json({ user });
});
