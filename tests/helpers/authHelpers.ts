import request from "supertest";
import { createTestUser } from "../factories/userFactory.js";
import { app } from "../setup/appTest.js";

export const createAgent = () => request.agent(app);

/**
 * Creates a test user, logs them in, and returns:
 * - agent (with cookies stored)
 * - user (DB user)
 *
 * Options:
 *   rememberMe?: boolean  → defaults to false
 */
export const loginTestUser = async (options: { rememberMe?: boolean } = {}) => {
	const agent = createAgent();
	const { user, email, password } = await createTestUser();

	const rememberMe = options.rememberMe === true;

	await agent.post("/api/auth/login").send({ email, password, rememberMe }).expect(200);

	return { agent, user };
};
