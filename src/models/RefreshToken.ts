import mongoose, { Schema } from "mongoose";
import type { IRefreshToken } from "../types";

const RefreshTokenSchema = new Schema<IRefreshToken>({
	token: String,
	userId: String,
	expiresAt: Date,
	isValid: Boolean,
});

export const RefreshToken = mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
