import type { Document } from "mongoose";

export type AppEnv = {
	NODE_ENV: "development" | "production" | "test" | string;
	PORT: string;
	MONGO_URI: string;
	ACCESS_TOKEN_SECRET: string;
	REFRESH_TOKEN_SECRET: string;
	ROTATE_REFRESH_TOKENS: string;
	VITEST: string;
	TEST_RATE_LIMITER: string;
	CORS_ORIGIN: string;
};

//------------------------------------------------------------
// User
//------------------------------------------------------------

export interface IUser extends Document {
	id: string;
	name: string;
	email: string;
	passwordHash: string;
	role: "user" | "admin";
	refreshToken?: string;
}

//------------------------------------------------------------
// Token
//------------------------------------------------------------

export interface IRefreshToken extends Document {
	id: string;
	token: string;
	userId: string;
	expiresAt: Date;
	isValid: boolean;
}

export interface JwtPayload {
	userId: string;
}
