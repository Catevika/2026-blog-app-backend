import request from "supertest";
import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { app } from "../../setup/appTest.js";
import { createTestUser } from "../../factories/userFactory.js";
import { loginTestUser } from "../../helpers/authHelpers.js";
import { Post } from "../../../src/models/Post.js";

describe("Posts integration tests", () => {
	// test setup clears DB via tests/setup hooks

	it("POST /api/posts/new creates a post and returns serialized post", async () => {
		const { agent, user } = await loginTestUser();

		const payload = {
			title: "Hello World",
			slug: "hello-world",
			locked: false,
			content: "This is a test post",
			status: "published",
		};

		const res = await agent.post("/api/posts/new").send(payload).expect(201);
		expect(res.body).toHaveProperty("id");
		expect(res.body.title).toBe(payload.title);
		expect(res.body.slug).toBe(payload.slug);
		expect(res.body.author).toHaveProperty("id", user._id.toString());
		expect(res.body.likeCount).toBe(0);
	});

	it("GET /api/posts/check-slug returns available and suggestion", async () => {
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

		const r1 = await request(app)
			.get("/api/posts/check-slug")
			.query({ slug: "bar" })
			.expect(200);
		expect(r1.body.available).toBe(true);
		expect(r1.body.suggestion).toBe("bar");

		const r2 = await request(app)
			.get("/api/posts/check-slug")
			.query({ slug: "foo" })
			.expect(200);
		expect(r2.body.available).toBe(false);
		expect(typeof r2.body.suggestion).toBe("string");
		expect(r2.body.suggestion.length).toBeGreaterThan(0);
	});

	it("GET /api/posts lists posts and supports search", async () => {
		const author = await createTestUser();

		await Post.create([
			{
				title: "Apple",
				slug: "apple",
				locked: true,
				content: "fruit",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 0,
			},
			{
				title: "Banana",
				slug: "banana",
				locked: true,
				content: "yellow fruit",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 0,
			},
		]);

		const res = await request(app).get("/api/posts").expect(200);
		expect(res.body).toHaveProperty("docs");
		expect(Array.isArray(res.body.docs)).toBe(true);
		expect(res.body.docs.length).toBeGreaterThanOrEqual(2);

		const s = await request(app)
			.get("/api/posts")
			.query({ search: "banana" })
			.expect(200);
		expect(s.body.docs.length).toBeGreaterThanOrEqual(1);
		expect(s.body.docs[0].title.toLowerCase()).toContain("banana");
	});

	it("GET /api/posts/feed returns feed", async () => {
		const author = await createTestUser();

		await Post.create({
			title: "Feed Post",
			slug: "feed-post",
			locked: false,
			content: "feed content",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(author.user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await request(app).get("/api/posts/feed").expect(200);
		expect(res.body.docs).toBeDefined();
		expect(Array.isArray(res.body.docs)).toBe(true);
		expect(res.body.docs.length).toBeGreaterThanOrEqual(1);
	});

	it("GET /api/posts/:id returns 200 for existing and 404 for missing", async () => {
		const author = await createTestUser();

		const created = await Post.create({
			title: "Detail",
			slug: "detail",
			locked: false,
			content: "detail content",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(author.user._id),
			likedBy: [],
			likeCount: 0,
		});

		const ok = await request(app)
			.get(`/api/posts/${created._id.toString()}`)
			.expect(200);
		expect(ok.body.id).toBe(created._id.toString());

		const notFound = await request(app)
			.get(`/api/posts/${new Types.ObjectId().toString()}`)
			.expect(404);
		expect(notFound.body.error).toBeDefined();
	});

	it("soft delete (PUT) and restore (POST /:id/restore) flow", async () => {
		const { agent, user } = await loginTestUser();

		const created = await Post.create({
			title: "ToDelete",
			slug: "to-delete",
			locked: false,
			content: "delete me",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(user._id),
			likedBy: [],
			likeCount: 0,
		});

		const delRes = await agent
			.put(`/api/posts/${created._id.toString()}`)
			.send({ deleted: true })
			.expect(200);
		expect(delRes.body.deleted).toBe(true);

		const restoreRes = await agent
			.post(`/api/posts/${created._id.toString()}/restore`)
			.expect(200);
		expect(restoreRes.body.deleted).toBe(false);
	});

	it("POST /api/posts/:id/like toggles like and returns counts", async () => {
		const author = await createTestUser();

		const created = await Post.create({
			title: "LikeMe",
			slug: "like-me",
			locked: false,
			content: "like content",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(author.user._id),
			likedBy: [],
			likeCount: 0,
		});

		const { agent: likerAgent, user: likerUser } = await loginTestUser();

		const likeRes = await likerAgent
			.post(`/api/posts/${created._id.toString()}/like`)
			.send({ userId: likerUser._id.toString() })
			.expect(200);

		expect(likeRes.body.success).toBe(true);
		expect(likeRes.body.liked).toBe(true);
		expect(likeRes.body.likeCount).toBe(1);
		expect(Array.isArray(likeRes.body.likedBy)).toBe(true);
		expect(likeRes.body.likedBy).toContain(likerUser._id.toString());

		const unlikeRes = await likerAgent
			.post(`/api/posts/${created._id.toString()}/like`)
			.send({ userId: likerUser._id.toString() })
			.expect(200);

		expect(unlikeRes.body.success).toBe(true);
		expect(unlikeRes.body.liked).toBe(false);
		expect(unlikeRes.body.likeCount).toBe(0);
	});
});
