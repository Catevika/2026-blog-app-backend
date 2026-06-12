import "express";

declare module "express-serve-static-core" {
	interface Request {
		user: {
			userId: string;
			role?: string;
		} | null;
		rateLimit?: {
			limit: number;
			current: number;
			remaining: number;
			resetTime?: Date;
		};
	}
}
