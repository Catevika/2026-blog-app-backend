import request from "supertest";
import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { app } from "../../setup/appTest.js";
import { createTestUser } from "../../factories/userFactory.js";
import { loginTestUser } from "../../helpers/authHelpers.js";
import { Post } from "../../../src/models/Post.js";

describe("Posts create & slug integration tests", () => {
	it("POST /api/posts/new returns 401 when not authenticated", async () => {
		const payload = {
			title: "Hello World",
			slug: "hello-world",
			content: "This is a test post",
		};

		const res = await request(app).post("/api/posts/new").send(payload).expect(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("POST /api/posts/new validates required fields", async () => {
		const { agent } = await loginTestUser();

		const res = await agent.post("/api/posts/new").send({}).expect(400);
		expect(res.body.message).toBe("Validation error");
		expect(res.body.errors).toHaveProperty("title");
		expect(res.body.errors).toHaveProperty("slug");
		expect(res.body.errors).toHaveProperty("content");
	});

	it("POST /api/posts/new creates a post with defaults and returns serialized post", async () => {
		const { agent, user } = await loginTestUser();

		const payload = {
			title: "Hello World",
			slug: "hello-world",
			content: "This is a test post",
		};

		const res = await agent.post("/api/posts/new").send(payload).expect(201);
		expect(res.body).toHaveProperty("id");
		expect(res.body.title).toBe(payload.title);
		expect(res.body.slug).toBe(payload.slug);
		expect(res.body.author).toHaveProperty("id", user._id.toString());
		expect(res.body.likeCount).toBe(0);
		// locked defaults to true, status defaults to "draft"
		expect(res.body.locked).toBe(true);
		expect(res.body.status).toBe("draft");
	});

	it("POST /api/posts/new returns 409 and suggestion when slug already exists", async () => {
		const { agent, user } = await loginTestUser();

		await Post.create({
			title: "Existing",
			slug: "existing-slug",
			locked: true,
			content: "x",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await agent
			.post("/api/posts/new")
			.send({
				title: "Another",
				slug: "existing-slug",
				content: "y",
			})
			.expect(409);

		expect(res.body.message).toBe("Slug already exists");
		expect(res.body.errors.slug).toBe("Slug already exists");
		expect(typeof res.body.suggestion).toBe("string");
		expect(res.body.suggestion.length).toBeGreaterThan(0);
	});

	it("POST /api/posts/new falls back to post-<timestamp> when slugifyFinal returns empty", async () => {
		const { agent } = await loginTestUser();

		const res = await agent
			.post("/api/posts/new")
			.send({
				title: "Weird",
				slug: "!!!",
				content: "weird content",
			})
			.expect(201);

		expect(res.body.slug.startsWith("post-")).toBe(true);
	});

	// ------------------ check-slug ------------------

	it("GET /api/posts/check-slug returns 400 when slug is missing", async () => {
		const res = await request(app).get("/api/posts/check-slug").query({}).expect(400);

		expect(res.body.available).toBe(false);
		expect(res.body.suggestion).toBeNull();
	});

	it("GET /api/posts/check-slug returns available and canonical suggestion", async () => {
		const res = await request(app)
			.get("/api/posts/check-slug")
			.query({ slug: "My New Post" })
			.expect(200);

		expect(res.body.available).toBe(true);
		expect(res.body.suggestion).toBe("my-new-post");
	});

	it("GET /api/posts/check-slug returns unavailable and suggestion when slug exists", async () => {
		const author = await createTestUser();

		await Post.create({
			title: "Foo",
			slug: "foo",
			locked: true,
			content: "x",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(author.user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await request(app).get("/api/posts/check-slug").query({ slug: "foo" }).expect(200);

		expect(res.body.available).toBe(false);
		expect(typeof res.body.suggestion).toBe("string");
		expect(res.body.suggestion.length).toBeGreaterThan(0);
	});

	it("GET /api/posts/check-slug respects excludeId (same post → available)", async () => {
		const author = await createTestUser();

		const post = await Post.create({
			title: "Foo",
			slug: "foo",
			locked: true,
			content: "x",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(author.user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await request(app)
			.get("/api/posts/check-slug")
			.query({ slug: "foo", excludeId: post._id.toString() })
			.expect(200);

		expect(res.body.available).toBe(true);
		expect(res.body.suggestion).toBe("foo");
	});
});
