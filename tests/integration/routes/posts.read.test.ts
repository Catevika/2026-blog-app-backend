import request from "supertest";
import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { app } from "../../setup/appTest.js";
import { createTestUser } from "../../factories/userFactory.js";
import { Post } from "../../../src/models/Post.js";
import { POSTS_PER_PAGE, FAVORITES_LIMIT } from "../../../src/config/post.js";

describe("Posts read/list/feed/favorites integration tests", () => {
	it("GET /api/posts lists posts and supports search", async () => {
		const author = await createTestUser();

		await Post.insertMany([
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

		const s = await request(app).get("/api/posts").query({ search: "banana" }).expect(200);
		expect(s.body.docs.length).toBeGreaterThanOrEqual(1);
		expect(s.body.docs[0].title.toLowerCase()).toContain("banana");

		const byAuthor = await request(app)
			.get("/api/posts")
			.query({ search: "admin test user" })
			.expect(200);
		expect(byAuthor.body.docs).toHaveLength(2);
		expect(byAuthor.body.docs.every((post: any) => post.author.name === "Admin Test User")).toBe(
			true,
		);
	});

	it("GET /api/posts supports status, deleted and author filters", async () => {
		const author1 = await createTestUser();
		const author2 = await createTestUser();

		await Post.insertMany([
			{
				title: "Published",
				slug: "published",
				locked: true,
				content: "pub",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author1.user._id),
				likedBy: [],
				likeCount: 0,
			},
			{
				title: "Draft",
				slug: "draft",
				locked: true,
				content: "draft",
				status: "draft",
				deleted: false,
				author: new Types.ObjectId(author1.user._id),
				likedBy: [],
				likeCount: 0,
			},
			{
				title: "Deleted",
				slug: "deleted",
				locked: true,
				content: "del",
				status: "published",
				deleted: true,
				author: new Types.ObjectId(author2.user._id),
				likedBy: [],
				likeCount: 0,
			},
		]);

		const byStatus = await request(app).get("/api/posts").query({ status: "draft" }).expect(200);
		expect(byStatus.body.docs.every((p: any) => p.status === "draft")).toBe(true);

		const deletedTrue = await request(app).get("/api/posts").query({ deleted: "true" }).expect(200);
		expect(deletedTrue.body.docs.every((p: any) => p.deleted === true)).toBe(true);

		const byAuthor = await request(app)
			.get("/api/posts")
			.query({ author: author1.user._id.toString() })
			.expect(200);
		expect(byAuthor.body.docs.every((p: any) => p.author.id === author1.user._id.toString())).toBe(
			true,
		);
	});

	it("GET /api/posts paginates all matching search results", async () => {
		const author = await createTestUser();

		const docs = [];
		for (let i = 0; i < POSTS_PER_PAGE * 2 + 1; i++) {
			docs.push({
				title: `Searchable Post ${i}`,
				slug: `searchable-post-${i}`,
				locked: true,
				content: "searchable content",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 0,
			});
		}
		await Post.insertMany(docs);

		const page1 = await request(app)
			.get("/api/posts")
			.query({ search: "searchable", page: 1 })
			.expect(200);
		const page2 = await request(app)
			.get("/api/posts")
			.query({ search: "searchable", page: 2 })
			.expect(200);

		expect(page1.body.docs).toHaveLength(POSTS_PER_PAGE);
		expect(page2.body.docs).toHaveLength(POSTS_PER_PAGE);
		expect(page1.body.pagination.totalDocs).toBe(POSTS_PER_PAGE * 2 + 1);
		expect(page1.body.pagination.totalPages).toBe(3);
		expect(page1.body.pagination.hasNextPage).toBe(true);
		expect(page2.body.pagination.hasPrevPage).toBe(true);
		expect(page1.body.docs.map((post: any) => post.id)).not.toEqual(
			page2.body.docs.map((post: any) => post.id),
		);
	});

	it("GET /api/posts supports pagination", async () => {
		const author = await createTestUser();

		const docs = [];
		for (let i = 0; i < POSTS_PER_PAGE * 2; i++) {
			docs.push({
				title: `PagePost ${i}`,
				slug: `page-post-${i}`,
				locked: true,
				content: "page content",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 0,
			});
		}
		await Post.insertMany(docs);

		const page1 = await request(app).get("/api/posts").query({ page: 1 }).expect(200);
		const page2 = await request(app).get("/api/posts").query({ page: 2 }).expect(200);

		expect(page1.body.docs.length).toBeLessThanOrEqual(POSTS_PER_PAGE);
		expect(page2.body.docs.length).toBeLessThanOrEqual(POSTS_PER_PAGE);
		expect(page1.body.pagination.page).toBe(1);
		expect(page2.body.pagination.page).toBe(2);
	});

	// ------------------ feed ------------------

	it("GET /api/posts/feed returns feed and supports search", async () => {
		const author = await createTestUser();

		await Post.insertMany([
			{
				title: "Feed Post",
				slug: "feed-post",
				locked: false,
				content: "feed content",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 0,
			},
			{
				title: "Another Feed",
				slug: "another-feed",
				locked: false,
				content: "more feed",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 0,
			},
		]);

		const res = await request(app).get("/api/posts/feed").expect(200);
		expect(Array.isArray(res.body.docs)).toBe(true);
		expect(res.body.docs.length).toBeGreaterThanOrEqual(1);

		const s = await request(app).get("/api/posts/feed").query({ search: "another" }).expect(200);
		expect(s.body.docs.length).toBeGreaterThanOrEqual(1);
		expect(s.body.docs[0].title.toLowerCase()).toContain("another");
	});

	it("GET /api/posts/feed paginates all matching search results", async () => {
		const author = await createTestUser();

		await Post.insertMany(
			Array.from({ length: POSTS_PER_PAGE + 1 }, (_, index) => ({
				title: `Feed Searchable ${index}`,
				slug: `feed-searchable-${index}`,
				locked: false,
				content: "feed searchable content",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 0,
			})),
		);

		const page1 = await request(app)
			.get("/api/posts/feed")
			.query({ search: "feed searchable", page: 1 })
			.expect(200);
		const page2 = await request(app)
			.get("/api/posts/feed")
			.query({ search: "feed searchable", page: 2 })
			.expect(200);

		expect(page1.body.docs).toHaveLength(POSTS_PER_PAGE);
		expect(page2.body.docs).toHaveLength(1);
		expect(page1.body.pagination.totalDocs).toBe(POSTS_PER_PAGE + 1);
		expect(page1.body.pagination.totalPages).toBe(2);
		expect(page2.body.pagination.hasNextPage).toBe(false);
	});

	// ------------------ favorites ------------------

	it("GET /api/posts/favorites returns top liked posts", async () => {
		const author = await createTestUser();

		await Post.insertMany([
			{
				title: "Most Liked",
				slug: "most-liked",
				locked: false,
				content: "x",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 10,
			},
			{
				title: "Less Liked",
				slug: "less-liked",
				locked: false,
				content: "y",
				status: "published",
				deleted: false,
				author: new Types.ObjectId(author.user._id),
				likedBy: [],
				likeCount: 1,
			},
		]);

		const res = await request(app).get("/api/posts/favorites").expect(200);
		expect(Array.isArray(res.body.docs)).toBe(true);
		expect(res.body.docs.length).toBeLessThanOrEqual(FAVORITES_LIMIT);
		expect(res.body.docs[0].likeCount).toBeGreaterThanOrEqual(res.body.docs[1].likeCount);
	});

	// ------------------ detail ------------------

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

		const ok = await request(app).get(`/api/posts/${created._id.toString()}`).expect(200);
		expect(ok.body.id).toBe(created._id.toString());

		const notFound = await request(app)
			.get(`/api/posts/${new Types.ObjectId().toString()}`)
			.expect(404);
		expect(notFound.body.error).toBeDefined();
	});
});
