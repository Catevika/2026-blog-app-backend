import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { Types } from "mongoose";
import type { Browser, Page } from "puppeteer";
import { Post } from "../../../src/models/Post.js";
import { User } from "../../../src/models/User.js";
import { loginTestUser } from "../../helpers/authHelpers.js";
import { createMockPuppeteer } from "../../helpers/createMockPuppeteer.js";
import { generateObjectId } from "../../helpers/generateObjectId.js";
import * as browserService from "../../../src/services/browserService.js";

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

	// ---------------------------------------------------------
	// 400 invalid postId
	// ---------------------------------------------------------
	it("400 when postId is missing or invalid", async () => {
		const { agent } = await loginTestUser();

		await agent.post("/api/pdf").send({}).expect(400);
		await agent.post("/api/pdf").send({ postId: "not-an-id" }).expect(400);
	});

	// ---------------------------------------------------------
	// 404 missing post
	// ---------------------------------------------------------
	it("404 when post is missing", async () => {
		const { agent } = await loginTestUser();
		const postId = generateObjectId();

		await agent.post("/api/pdf").send({ postId }).expect(404);
	});

	// ---------------------------------------------------------
	// 410 deleted post
	// ---------------------------------------------------------
	it("410 when post is deleted", async () => {
		const { agent, user } = await loginTestUser();

		const postId = new Types.ObjectId();
		await Post.create({
			_id: postId,
			title: "Deleted",
			slug: "deleted",
			content: "x",
			author: user._id,
			status: "published",
			deleted: true,
			likedBy: [],
		});

		await agent.post("/api/pdf").send({ postId }).expect(410);
	});

	// ---------------------------------------------------------
	// 403 draft not owned
	// ---------------------------------------------------------
	it("403 when exporting a draft not owned by user", async () => {
		const { agent } = await loginTestUser();

		const otherUser = await User.create({
			name: "Other",
			email: "other@example.com",
			passwordHash: "dummy",
			role: "user",
		});

		const postId = new Types.ObjectId();
		await Post.create({
			_id: postId,
			title: "Draft",
			slug: "draft",
			content: "x",
			author: otherUser._id,
			status: "draft",
			deleted: false,
			likedBy: [],
		});

		await agent.post("/api/pdf").send({ postId }).expect(403);
	});

	// ---------------------------------------------------------
	// 200 draft owned by author
	// ---------------------------------------------------------
	it("allows author to export their own draft", async () => {
		const { agent, user } = await loginTestUser();

		const postId = new Types.ObjectId();
		await Post.create({
			_id: postId,
			title: "Draft",
			slug: "draft",
			content: "x",
			author: user._id,
			status: "draft",
			deleted: false,
			likedBy: [],
		});

		const { raw } = createMockPuppeteer();
		raw.page.goto.mockResolvedValue(undefined);
		raw.page.evaluate.mockResolvedValue(true);
		raw.page.pdf.mockResolvedValue(Buffer.from("draft-pdf"));

		vi.spyOn(browserService, "createBrowser").mockResolvedValue({
			newPage: vi.fn().mockResolvedValue(raw.page as unknown as Page),
			close: vi.fn().mockResolvedValue(undefined),
		} as unknown as Browser);

		const res = await agent
			.post("/api/pdf")
			.buffer(true)
			.send({ postId: postId.toString(), title: "Draft Export" })
			.expect(200);

		expect(res.body).toEqual(Buffer.from("draft-pdf"));
	});

	// ---------------------------------------------------------
	// 200 published post (original passing test)
	// ---------------------------------------------------------
	it("exports published post (mocked browser) and returns PDF buffer", async () => {
		const { agent, user } = await loginTestUser();

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

		const { raw } = createMockPuppeteer();
		raw.page.goto.mockResolvedValue(undefined);
		raw.page.evaluate.mockResolvedValue(true);
		raw.page.pdf.mockResolvedValue(Buffer.from("int-pdf"));

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
	});

	// ---------------------------------------------------------
	// 500 frontend not ready
	// ---------------------------------------------------------
	it("500 when frontend is not ready (#export-ready missing)", async () => {
		const { agent, user } = await loginTestUser();

		const postId = new Types.ObjectId();
		await Post.create({
			_id: postId,
			title: "Post",
			slug: "post",
			content: "x",
			author: user._id,
			status: "published",
			deleted: false,
			likedBy: [],
		});

		const { raw } = createMockPuppeteer();

		// Frontend NOT ready
		raw.page.goto.mockResolvedValue(undefined);

		// MUST reject → route interprets as "not ready"
		raw.page.waitForSelector.mockRejectedValue(new Error("not found"));

		// MUST return null → route interprets as "not ready"
		raw.page.$.mockResolvedValue(null);

		// MUST return false → route interprets as "not ready"
		raw.page.evaluate.mockResolvedValue(false);

		vi.spyOn(browserService, "createBrowser").mockResolvedValue({
			newPage: vi.fn().mockResolvedValue(raw.page as unknown as Page),
			close: vi.fn().mockResolvedValue(undefined),
		} as unknown as Browser);

		const res = await agent.post("/api/pdf").send({ postId: postId.toString() }).expect(500);

		expect(res.body.message).toBe("Failed to generate PDF");
	});

	// ---------------------------------------------------------
	// 504 timeout
	// ---------------------------------------------------------
	it("504 when puppeteer times out", async () => {
		const { agent, user } = await loginTestUser();

		const postId = new Types.ObjectId();
		await Post.create({
			_id: postId,
			title: "Timeout",
			slug: "timeout",
			content: "x",
			author: user._id,
			status: "published",
			deleted: false,
			likedBy: [],
		});

		const { raw } = createMockPuppeteer();
		raw.page.goto.mockRejectedValue(new Error("timeout exceeded"));

		vi.spyOn(browserService, "createBrowser").mockResolvedValue({
			newPage: vi.fn().mockResolvedValue(raw.page as unknown as Page),
			close: vi.fn().mockResolvedValue(undefined),
		} as unknown as Browser);

		const res = await agent.post("/api/pdf").send({ postId: postId.toString() }).expect(504);

		expect(res.body.message).toBe("PDF rendering timed out - page too complex");
	});
});
