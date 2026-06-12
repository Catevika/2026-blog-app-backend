import request from "supertest";
import { describe, it, expect } from "vitest";
import { Types } from "mongoose";
import { app } from "../../setup/appTest.js";
import { createTestUser } from "../../factories/userFactory.js";
import { loginTestUser } from "../../helpers/authHelpers.js";
import { Post } from "../../../src/models/Post.js";

describe("Posts modify/update/restore/like integration tests", () => {
	// ------------------ PUT /:id ------------------

	it("PUT /api/posts/:id returns 401 when not authenticated", async () => {
		const postId = new Types.ObjectId().toString();
		const res = await request(app).put(`/api/posts/${postId}`).send({ title: "New" }).expect(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("PUT /api/posts/:id returns 403 when editing someone else's post", async () => {
		const author = await createTestUser();
		const { agent } = await loginTestUser();

		const post = await Post.create({
			title: "Owned by other",
			slug: "owned-other",
			locked: false,
			content: "x",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(author.user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await agent
			.put(`/api/posts/${post._id.toString()}`)
			.send({ title: "Hack" })
			.expect(403);

		expect(res.body.error).toBe("Not authorized");
	});

	it("PUT /api/posts/:id validates fields", async () => {
		const { agent, user } = await loginTestUser();

		const post = await Post.create({
			title: "Valid",
			slug: "valid",
			locked: false,
			content: "content",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await agent
			.put(`/api/posts/${post._id.toString()}`)
			.send({ title: " ", slug: " ", content: " " })
			.expect(400);

		expect(res.body.message).toBe("Validation error");
		expect(res.body.errors).toHaveProperty("title");
		expect(res.body.errors).toHaveProperty("slug");
		expect(res.body.errors).toHaveProperty("content");
	});

	it("PUT /api/posts/:id updates post and slug when valid", async () => {
		const { agent, user } = await loginTestUser();

		const post = await Post.create({
			title: "Old",
			slug: "old-slug",
			locked: false,
			content: "old content",
			status: "draft",
			deleted: false,
			author: new Types.ObjectId(user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await agent
			.put(`/api/posts/${post._id.toString()}`)
			.send({
				title: "New Title",
				slug: "new-slug",
				content: "new content",
				status: "published",
				locked: true,
			})
			.expect(200);

		expect(res.body.title).toBe("New Title");
		expect(res.body.slug).toBe("new-slug");
		expect(res.body.content).toBe("new content");
		expect(res.body.status).toBe("published");
		expect(res.body.locked).toBe(true);
	});

	it("PUT /api/posts/:id returns 409 when slug conflicts", async () => {
		const { agent, user } = await loginTestUser();

		await Post.create({
			title: "Other",
			slug: "conflict-slug",
			locked: false,
			content: "x",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(user._id),
			likedBy: [],
			likeCount: 0,
		});

		const post = await Post.create({
			title: "Mine",
			slug: "mine-slug",
			locked: false,
			content: "y",
			status: "draft",
			deleted: false,
			author: new Types.ObjectId(user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await agent
			.put(`/api/posts/${post._id.toString()}`)
			.send({ slug: "conflict-slug" })
			.expect(409);

		expect(res.body.message).toBe("Slug already exists");
		expect(res.body.errors.slug).toBe("Slug already exists");
		expect(typeof res.body.suggestion).toBe("string");
	});

	// ------------------ trash & restore ------------------

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

		const restoreRes = await agent.post(`/api/posts/${created._id.toString()}/restore`).expect(200);
		expect(restoreRes.body.deleted).toBe(false);
	});

	it("POST /api/posts/:id/restore returns 401 when not authenticated", async () => {
		const postId = new Types.ObjectId().toString();
		const res = await request(app).post(`/api/posts/${postId}/restore`).expect(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	// ------------------ like ------------------

	it("POST /api/posts/:id/like returns 401 when not authenticated", async () => {
		const postId = new Types.ObjectId().toString();
		const res = await request(app)
			.post(`/api/posts/${postId}/like`)
			.send({ userId: new Types.ObjectId().toString() })
			.expect(401);
		expect(res.body.error).toBe("Unauthorized");
	});

	it("POST /api/posts/:id/like returns 400 when userId missing", async () => {
		const author = await createTestUser();
		const { agent } = await loginTestUser();

		const post = await Post.create({
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

		const res = await agent.post(`/api/posts/${post._id.toString()}/like`).send({}).expect(400);

		expect(res.body.success).toBe(false);
		expect(res.body.message).toBe("userId required");
	});

	it("POST /api/posts/:id/like prevents author from liking own post", async () => {
		const { agent, user } = await loginTestUser();

		const post = await Post.create({
			title: "Own",
			slug: "own-post",
			locked: false,
			content: "own content",
			status: "published",
			deleted: false,
			author: new Types.ObjectId(user._id),
			likedBy: [],
			likeCount: 0,
		});

		const res = await agent
			.post(`/api/posts/${post._id.toString()}/like`)
			.send({ userId: user._id.toString() })
			.expect(403);

		expect(res.body.success).toBe(false);
		expect(res.body.message).toBe("Authors cannot like their own posts");
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
