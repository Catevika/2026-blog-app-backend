import { vi } from "vitest";
import { Types } from "mongoose";
import type { Browser, Page } from "puppeteer";
import { Post } from "../../../src/models/Post.js";
import { User } from "../../../src/models/User.js";
import { loginTestUser } from "../../helpers/authHelpers.js";
import { createMockPuppeteer } from "../../helpers/createMockPuppeteer.js";
import { generateObjectId } from "../../helpers/generateObjectId.js";
import * as browserService from "../../../src/services/browserService.js";
import { afterEach, beforeEach, describe, expect, it, Mock } from "vitest";

process.env["FRONTEND_URL"] = "http://mock-frontend";

describe("PDF route integration (in-memory DB, puppeteer mocked)", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		await Post.deleteMany({});
		await User.deleteMany({});
	});

	afterEach(async () => {
		await Post.deleteMany({});
		await User.deleteMany({});
		vi.restoreAllMocks();
	});

	it("returns 404 when post is missing", async () => {
		const { agent } = await loginTestUser();

		const postId = generateObjectId();

		await agent.post("/api/pdf").send({ postId }).expect(404);
	});

	it("exports published post (mocked browser) and returns PDF buffer", async () => {
		const { agent, user } = await loginTestUser();

		// Create a published post for this user
		const postId = new Types.ObjectId();
		await Post.create({
			_id: postId,
			title: "Integration Post",
			slug: "integration-post",
			content: "Hello",
			author: user._id,
			status: "published",
			deleted: false,
			likedBy: [],
		});

		// Create typed puppeteer mocks
		const { raw } = createMockPuppeteer();

		raw.page.goto.mockResolvedValue(undefined);
		raw.page.evaluate.mockResolvedValue(true);
		raw.page.pdf.mockResolvedValue(Buffer.from("int-pdf"));

		// Spy on createBrowser and mock it to return our fake browser
		vi.spyOn(browserService, "createBrowser").mockResolvedValue({
			newPage: vi.fn().mockResolvedValue(raw.page as unknown as Page),
			close: vi.fn().mockResolvedValue(undefined),
		} as unknown as Browser);

		const res = await agent
			.post("/api/pdf")
			.buffer(true)
			.send({ postId: postId.toString(), title: "Integration" })
			.expect(200)
			.expect("Content-Type", /application\/pdf/);

		expect(res.body).toEqual(Buffer.from("int-pdf"));
		expect(raw.page.goto).toHaveBeenCalled();
		expect(raw.page.evaluate).toHaveBeenCalled();
		expect(raw.page.pdf).toHaveBeenCalled();
		expect(
			(browserService.createBrowser as unknown as Mock).mock.calls.length
		).toBeGreaterThanOrEqual(1);
	});
});
