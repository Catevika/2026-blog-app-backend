import mongoose, { Schema } from "mongoose";
import type { IRefreshTokenDoc } from "../types/index.js";

const refreshTokenSchema = new Schema<IRefreshTokenDoc>({
	token: { type: String, required: true, index: true },
	userId: { type: String, required: true, index: true },
	rememberMe: { type: Boolean, required: true, default: false },
	expiresAt: { type: Date, required: true },
	isValid: { type: Boolean, required: true, default: true },
});

export const RefreshToken = mongoose.model<IRefreshTokenDoc>("RefreshToken", refreshTokenSchema);
