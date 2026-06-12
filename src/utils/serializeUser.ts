import type { IUser } from "../types/index.js";

export function serializeUser(user: IUser) {
	return {
		id: user._id.toString(),
		name: user.name,
		email: user.email,
		role: user.role,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}
