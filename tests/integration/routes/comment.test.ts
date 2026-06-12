import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "../../setup/appTest.js";
import { createTestUser } from "../../factories/userFactory.js";
import { loginTestUser } from "../../helpers/authHelpers.js";
import { createTestPost } from "../../factories/postFactory.js";
import { createTestComment } from "../../factories/commentFactory.js";
import { Comment } from "../../../src/models/Comment.js";

/* -------------------------------------------------------
   GET /api/posts/:postId/comments
------------------------------------------------------- */
describe("Comments integration tests", () => {
	it("GET /comments returns empty list", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });

		const res = await request(app).get(`/api/posts/${post._id.toString()}/comments`).expect(200);

		expect(res.body.comments).toEqual([]);
	});

	it("GET /comments returns serialized comments", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });

		await createTestComment({
			post,
			author: user,
			content: "Hello",
		});

		const res = await request(app).get(`/api/posts/${post._id.toString()}/comments`).expect(200);

		expect(res.body.comments.length).toBe(1);
		expect(res.body.comments[0].content).toBe("Hello");
		expect(res.body.comments[0]).toHaveProperty("author");
		expect(res.body.comments[0]).toHaveProperty("liked", false);
	});

	it("GET /comments invalid postId → 400", async () => {
		const res = await request(app).get("/api/posts/invalid/comments").expect(400);

		expect(res.body.error).toBe("Invalid post ID");
	});

	it("GET /comments logged-in user sees liked=true", async () => {
		// Author creates the post + comment
		const { user: author } = await createTestUser();
		const post = await createTestPost({ author });
		const comment = await createTestComment({ post, author });

		// Liker logs in
		const { agent, user: liker } = await loginTestUser();

		// Manually like the comment as the liker
		await Comment.findByIdAndUpdate(comment._id, {
			likedBy: [liker._id.toString()],
			likeCount: 1,
		});

		// Liker fetches comments
		const res = await agent.get(`/api/posts/${post._id.toString()}/comments`).expect(200);

		expect(res.body.comments[0].liked).toBe(true);
		expect(res.body.comments[0].likeCount).toBe(1);
		expect(res.body.comments[0].likedBy).toContain(liker._id.toString());
	});

	/* -------------------------------------------------------
     GET /api/posts/:postId/comments/tree
  ------------------------------------------------------- */
	it("GET /comments/tree returns nested structure", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });

		const root = await createTestComment({ post, author: user, content: "A" });
		// child of root
		await createTestComment({
			post,
			author: user,
			content: "B",
			parent: root,
		});

		const res = await request(app)
			.get(`/api/posts/${post._id.toString()}/comments/tree`)
			.expect(200);

		expect(res.body.comments.length).toBe(1);
		expect(res.body.comments[0].replies.length).toBe(1);
		expect(res.body.comments[0].replies[0].content).toBe("B");
	});

	it("GET /comments/tree filters deleted replies", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });

		const root = await createTestComment({ post, author: user });
		await createTestComment({
			post,
			author: user,
			parent: root,
			deleted: true,
		});

		const res = await request(app)
			.get(`/api/posts/${post._id.toString()}/comments/tree`)
			.expect(200);

		expect(res.body.comments[0].replies.length).toBe(0);
	});

	it("GET /comments/tree invalid postId → 400", async () => {
		const res = await request(app).get("/api/posts/invalid/comments/tree").expect(400);

		expect(res.body.error).toBe("Invalid post ID");
	});

	/* -------------------------------------------------------
     POST /api/posts/:postId/comments
  ------------------------------------------------------- */
	it("POST /comments requires auth → 401", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });

		await request(app)
			.post(`/api/posts/${post._id.toString()}/comments`)
			.send({ content: "Hi" })
			.expect(401);
	});

	it("POST /comments invalid content → 400", async () => {
		const { agent, user } = await loginTestUser();
		const post = await createTestPost({ author: user });

		const res = await agent
			.post(`/api/posts/${post._id.toString()}/comments`)
			.send({ content: " " })
			.expect(400);

		expect(res.body.errors).toBeDefined();
	});

	it("POST /comments creates comment", async () => {
		const { agent, user } = await loginTestUser();
		const post = await createTestPost({ author: user });

		const res = await agent
			.post(`/api/posts/${post._id.toString()}/comments`)
			.send({ content: "Hello world" })
			.expect(201);

		expect(res.body.comment.content).toBe("Hello world");
		expect(res.body.comment.author.id).toBe(user._id.toString());
	});

	/* -------------------------------------------------------
     POST /comments/:id/like
  ------------------------------------------------------- */
	it("POST /comments/:id/like requires auth → 401", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });
		const c = await createTestComment({ post, author: user });

		await request(app).post(`/api/posts/${post._id.toString()}/comments/${c._id}/like`).expect(401);
	});

	it("POST /comments/:id/like toggles like/unlike", async () => {
		const { user: author } = await createTestUser();
		const post = await createTestPost({ author });

		const { user: _liker, agent } = await loginTestUser();

		const c = await createTestComment({ post, author });

		const like = await agent
			.post(`/api/posts/${post._id.toString()}/comments/${c._id}/like`)
			.expect(200);

		expect(like.body.liked).toBe(true);
		expect(like.body.likeCount).toBe(1);

		const unlike = await agent
			.post(`/api/posts/${post._id.toString()}/comments/${c._id}/like`)
			.expect(200);

		expect(unlike.body.liked).toBe(false);
		expect(unlike.body.likeCount).toBe(0);
	});

	it("POST /comments/:id/like cannot like own comment → 403", async () => {
		const { agent, user } = await loginTestUser();
		const post = await createTestPost({ author: user });
		const c = await createTestComment({ post, author: user });

		const res = await agent
			.post(`/api/posts/${post._id.toString()}/comments/${c._id}/like`)
			.expect(403);

		expect(res.body.message).toBe("Authors cannot like their own comments");
	});

	/* -------------------------------------------------------
     PUT /comments/:id
  ------------------------------------------------------- */
	it("PUT /comments/:id requires auth → 401", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });
		const c = await createTestComment({ post, author: user });

		await request(app)
			.put(`/api/posts/${post._id.toString()}/comments/${c._id}`)
			.send({ content: "Updated" })
			.expect(401);
	});

	it("PUT /comments/:id updates comment", async () => {
		const { agent, user } = await loginTestUser();
		const post = await createTestPost({ author: user });
		const c = await createTestComment({ post, author: user });

		const res = await agent
			.put(`/api/posts/${post._id.toString()}/comments/${c._id}`)
			.send({ content: "Updated content" })
			.expect(200);

		expect(res.body.comment.content).toBe("Updated content");
	});

	it("PUT /comments/:id editing someone else’s comment → 403", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });
		const c = await createTestComment({ post, author: user });

		const { agent: otherAgent } = await loginTestUser();

		const res = await otherAgent
			.put(`/api/posts/${post._id.toString()}/comments/${c._id}`)
			.send({ content: "Hack" })
			.expect(403);

		expect(res.body.error).toBe("Not allowed");
	});

	/* -------------------------------------------------------
     DELETE /comments/:id
  ------------------------------------------------------- */
	it("DELETE /comments/:id deletes comment", async () => {
		const { agent, user } = await loginTestUser();
		const post = await createTestPost({ author: user });
		const c = await createTestComment({ post, author: user });

		const res = await agent
			.delete(`/api/posts/${post._id.toString()}/comments/${c._id}`)
			.expect(200);

		expect(res.body.comment.deleted).toBe(true);
		expect(res.body.comment.content).toBe("[deleted]");
	});

	it("DELETE /comments/:id deleting someone else’s comment → 403", async () => {
		const { user } = await createTestUser();
		const post = await createTestPost({ author: user });
		const c = await createTestComment({ post, author: user });

		const { agent: otherAgent } = await loginTestUser();

		const res = await otherAgent
			.delete(`/api/posts/${post._id.toString()}/comments/${c._id}`)
			.expect(403);

		expect(res.body.error).toBe("Not allowed");
	});
});
