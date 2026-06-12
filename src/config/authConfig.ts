import type { CookieOptions } from "express";
import { AUTH as AUTH_RAW } from "./auth.js";
import { ENV } from "./env.js";

function required(name: string, value?: string): string {
	if (!value || value.trim() === "") {
		throw new Error(`${name} is required`);
	}
	return value;
}

export const ACCESS_TOKEN_SECRET = required("ACCESS_TOKEN_SECRET", ENV.ACCESS_TOKEN_SECRET);
export const REFRESH_TOKEN_SECRET = required("REFRESH_TOKEN_SECRET", ENV.REFRESH_TOKEN_SECRET);

export const ACCESS_COOKIE_NAME = required("ACCESS_COOKIE_NAME", AUTH_RAW.ACCESS_COOKIE_NAME);
export const REFRESH_COOKIE_NAME = required("REFRESH_COOKIE_NAME", AUTH_RAW.REFRESH_COOKIE_NAME);

export const ACCESS_TOKEN_EXPIRES_IN = AUTH_RAW.ACCESS_TOKEN_EXPIRES_IN;

export const REFRESH_TOKEN_EXPIRES_IN = AUTH_RAW.REFRESH_TOKEN_EXPIRES_IN;
export const REFRESH_TOKEN_EXPIRES_IN_REMEMBER = AUTH_RAW.REFRESH_TOKEN_EXPIRES_IN_REMEMBER;

export const ACCESS_TOKEN_MAX_AGE = AUTH_RAW.ACCESS_TOKEN_MAX_AGE;

export const REFRESH_TOKEN_MAX_AGE = AUTH_RAW.REFRESH_TOKEN_MAX_AGE;
export const REFRESH_TOKEN_MAX_AGE_REMEMBER = AUTH_RAW.REFRESH_TOKEN_MAX_AGE_REMEMBER;

export const cookieBase: CookieOptions = {
	httpOnly: AUTH_RAW.COOKIE_OPTIONS.httpOnly,
	secure: AUTH_RAW.COOKIE_OPTIONS.secure,
	sameSite: AUTH_RAW.COOKIE_OPTIONS.sameSite as CookieOptions["sameSite"],
};
