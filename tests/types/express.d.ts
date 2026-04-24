import "express";

declare global {
	namespace Express {
		interface Request {
			user?: {
				userId: string;
				role?: string;
			};
			rateLimit?: {
				limit: number;
				current: number;
				remaining: number;
				resetTime?: Date;
			};
		}
	}
}
