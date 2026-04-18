import request from "supertest";
import { createTestUser } from "../factories/userFactory.js";
import { app } from "../setup/appTest.js";

export const createAgent = () => request.agent(app);

/**
 * Creates a test user, logs them in, and returns:
 * - agent (with cookies stored)
 * - user (DB user)
 */
export const loginTestUser = async () => {
	const agent = createAgent();
	const { user, email, password } = await createTestUser();

	await agent.post("/api/auth/login").send({ email, password }).expect(200);

	return { agent, user };
};
