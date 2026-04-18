import bcrypt from "bcryptjs";
import { User } from "../../src/models/User.js";

export const createTestUser = async () => {
	const email = `admin_${Date.now()}@test.com`;
	const password = "12345678";
	const name = "Admin Test User";

	const passwordHash = await bcrypt.hash(password, 12);

	const user = await User.create({
		email,
		name,
		passwordHash,
		role: "admin",
	});

	return { user, email, password };
};
