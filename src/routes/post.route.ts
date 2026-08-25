import type { Request, Response } from "express";
import express from "express";
import { Types } from "mongoose";
import {
	FAVORITES_LIMIT,
	FEED_PER_PAGE,
	FEED_TOTAL_LIMIT,
	POSTS_PER_PAGE,
	POSTS_TOTAL_LIMIT,
} from "../config/post.js";
import { InvalidPostIdError, PostNotFoundError } from "../errors/postErrors.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { Post } from "../models/Post.js";
import { User } from "../models/User.js";
import type {
	CheckSlugQuery,
	CheckSlugResponse,
	DuplicateError,
	IUserRef,
	PopulatedPost,
	PostBody,
	PostCreateResponse,
	PostDeleteResponse,
	PostFilter,
	PostQuery,
	PostResponse,
	PostRestoreResponse,
	PostsResponse,
	PostUpdateResponse,
	SerializedPost,
} from "../types/index.js";
import { resolvePostId } from "../utils/resolvePostId.js";
import { serializePost } from "../utils/serializePost.js";
import { slugifyFinal } from "../utils/slugUtils.js";

const router = express.Router();

async function findAuthorIds(search: string): Promise<Types.ObjectId[]> {
	const users = await User.find({
		$or: [
			{ name: { $regex: search, $options: "i" } },
			{ email: { $regex: search, $options: "i" } },
		],
	})
		.select("_id")
		.lean()
		.exec();

	return users.map((user) => user._id);
}

/* ------------------------------------------------------------
     Duplicate key guard
------------------------------------------------------------ */
function isDuplicateError(error: unknown): error is DuplicateError {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof (error as any).code === "number"
	) {
		return (error as any).code === 11000;
	}
	return false;
}

/* ------------------------------------------------------------
     POST /api/posts (create)
------------------------------------------------------------ */
router.post(
	"/new",
	requireAuth,
	async (req: Request<object, PostCreateResponse, PostBody>, res: Response<PostCreateResponse>) => {
		try {
			const { title, slug, locked, content, status } = req.body ?? ({} as PostBody);

			const errors: Record<string, string> = {};

			if (!title?.trim()) errors["title"] = "Title is required";
			if (!slug?.trim()) errors["slug"] = "Slug is required";
			if (!content?.trim()) errors["content"] = "Content is required";

			if (Object.keys(errors).length > 0) {
				return res.status(400).json({ message: "Validation error", errors });
			}

			if (!req.user) return res.status(401).json({ message: "Unauthorized" });

			const canonical = slugifyFinal(slug);
			const finalSlug = canonical || `post-${Date.now()}`;

			const exists = await Post.findOne({
				slug: finalSlug,
				deleted: false,
			} as unknown as PostFilter)
				.lean()
				.exec();

			if (exists) {
				const suggestion = await Post.computeSuggestion(finalSlug);

				return res.status(409).json({
					message: "Slug already exists",
					errors: { slug: "Slug already exists" },
					suggestion,
				});
			}

			const postDoc = await Post.create({
				title: title.trim(),
				slug: finalSlug,
				locked: locked ?? true,
				content,
				status: status ?? "draft",
				deleted: false,
				author: new Types.ObjectId(req.user.userId),
				likedBy: [],
				likeCount: 0,
			});

			const populated = (await Post.findById(postDoc._id)
				.populate<{ author: IUserRef }>("author", "name email")
				.lean()
				.exec()) as PopulatedPost | null;

			if (!populated) {
				return res.status(500).json({ message: "Unable to fetch created post" });
			}

			return res.status(201).json(serializePost(populated));
		} catch (err) {
			if (isDuplicateError(err)) {
				return res.status(409).json({
					message: "Slug already exists",
					errors: { slug: "Slug already exists" },
				});
			}

			console.error("POST /posts error:", err);
			return res.status(500).json({ message: "Unable to create post" });
		}
	},
);

/* ------------------------------------------------------------
     GET /api/posts/check-slug
------------------------------------------------------------ */
router.get(
	"/check-slug",
	async (
		req: Request<object, CheckSlugResponse, object, CheckSlugQuery>,
		res: Response<CheckSlugResponse>,
	) => {
		try {
			const raw = typeof req.query.slug === "string" ? req.query.slug : "";
			const excludeId = typeof req.query.excludeId === "string" ? req.query.excludeId : undefined;

			if (!raw.trim()) {
				return res.status(400).json({ available: false, suggestion: null });
			}

			const canonical = slugifyFinal(raw);
			if (!canonical) {
				return res.json({ available: false, suggestion: null });
			}

			const existsQuery: Record<string, unknown> = { slug: canonical, deleted: false };
			if (excludeId) {
				try {
					existsQuery["_id"] = { $ne: new Types.ObjectId(excludeId) };
				} catch {
					existsQuery["_id"] = { $ne: excludeId };
				}
			}

			const exists = await Post.exists(existsQuery);

			if (!exists) {
				return res.json({ available: true, suggestion: canonical });
			}

			const suggestion = await Post.computeSuggestion(canonical);
			return res.json({ available: false, suggestion });
		} catch (err) {
			console.error("GET /api/posts/check-slug error:", err);
			return res.status(500).json({ available: false, suggestion: null });
		}
	},
);

/* ------------------------------------------------------------
     GET /api/posts (PostList + Search) - sorted by UpdatedAt
------------------------------------------------------------ */
router.get(
	"/",
	async (req: Request<object, PostsResponse, object, PostQuery>, res: Response<PostsResponse>) => {
		try {
			const page = Math.max(1, Number(req.query.page ?? 1));
			const skip = (page - 1) * POSTS_PER_PAGE;

			const filter: PostFilter = {};

			if (typeof req.query.status === "string") {
				filter.status = req.query.status;
			}

			if (typeof req.query.deleted === "string") {
				filter.deleted = req.query.deleted === "true";
			}

			if (typeof req.query.author === "string" && req.query.author.trim()) {
				filter.author = req.query.author;
			}

			const search =
				typeof req.query.search === "string" && req.query.search.trim()
					? req.query.search.trim()
					: undefined;

			if (search) {
				const authorIds = await findAuthorIds(search);
				filter.$or = [
					{ title: { $regex: search, $options: "i" } },
					{ content: { $regex: search, $options: "i" } },
					...(authorIds.length > 0 ? [{ author: { $in: authorIds } }] : []),
				];
			}

			const [rows, totalDocsRaw] = await Promise.all([
				Post.find(filter)
					.sort({ updatedAt: -1 })
					.skip(skip)
					.limit(POSTS_PER_PAGE)
					.populate<{ author: IUserRef }>("author", "name email")
					.lean()
					.exec()
					.then((rows) => rows as PopulatedPost[]),

				Post.countDocuments(filter),
			]);

			const totalDocs = Math.min(totalDocsRaw, POSTS_TOTAL_LIMIT);
			const totalPages = Math.max(1, Math.ceil(totalDocs / POSTS_PER_PAGE));

			return res.json({
				docs: rows.map(serializePost),
				pagination: {
					totalDocs,
					limit: POSTS_PER_PAGE,
					page,
					totalPages,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1,
					nextPage: page < totalPages ? page + 1 : null,
					prevPage: page > 1 ? page - 1 : null,
				},
			});
		} catch (err) {
			console.error("GET /posts error:", err);
			return res.status(500).json({ error: "Failed to fetch posts" });
		}
	},
);

/* ------------------------------------------------------------
   GET /api/posts/feed (Feed with Search)
------------------------------------------------------------ */
router.get(
	"/feed",
	async (req: Request<object, PostsResponse, object, PostQuery>, res: Response<PostsResponse>) => {
		try {
			const page = Math.max(1, Number(req.query.page ?? 1));
			const skip = (page - 1) * FEED_PER_PAGE;

			const search =
				typeof req.query.search === "string" && req.query.search.trim()
					? req.query.search.trim()
					: undefined;

			const filter: PostFilter = {
				status: "published",
				deleted: false,
			};

			if (search) {
				const authorIds = await findAuthorIds(search);
				filter.$or = [
					{ title: { $regex: search, $options: "i" } },
					{ content: { $regex: search, $options: "i" } },
					...(authorIds.length > 0 ? [{ author: { $in: authorIds } }] : []),
				];
			}

			const [posts, totalDocsRaw] = await Promise.all([
				Post.find(filter)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(FEED_PER_PAGE)
					.populate<{ author: IUserRef }>("author", "name email")
					.lean()
					.exec()
					.then((rows) => rows as PopulatedPost[]),

				Post.countDocuments(filter),
			]);

			const totalDocs = Math.min(totalDocsRaw, FEED_TOTAL_LIMIT);
			const totalPages = Math.max(1, Math.ceil(totalDocs / FEED_PER_PAGE));

			return res.json({
				docs: posts.map(serializePost),
				pagination: {
					totalDocs,
					limit: FEED_PER_PAGE,
					page,
					totalPages,
					hasNextPage: page < totalPages,
					hasPrevPage: page > 1,
					nextPage: page < totalPages ? page + 1 : null,
					prevPage: page > 1 ? page - 1 : null,
				},
			});
		} catch {
			return res.status(500).json({ error: "Failed to fetch feed" });
		}
	},
);

/* ------------------------------------------------------------
     GET /api/posts/favorites (paginated, 5 posts max)
------------------------------------------------------------ */
router.get(
	"/favorites",
	async (req: Request<object, PostsResponse, object, PostQuery>, res: Response<PostsResponse>) => {
		try {
			const page = Math.max(1, Number(req.query.page ?? 1));
			const skip = (page - 1) * FAVORITES_LIMIT;

			const posts = await Post.find({
				status: "published",
				deleted: false,
			})
				.sort({ likeCount: -1 })
				.skip(skip)
				.limit(FAVORITES_LIMIT)
				.populate<{ author: IUserRef }>("author", "name email")
				.lean()
				.exec()
				.then((rows) => rows as PopulatedPost[]);

			const totalDocs = FAVORITES_LIMIT;
			const totalPages = 1;

			return res.json({
				docs: posts.map(serializePost),
				pagination: {
					totalDocs,
					limit: FAVORITES_LIMIT,
					page,
					totalPages,
					hasNextPage: false,
					hasPrevPage: false,
					nextPage: null,
					prevPage: null,
				},
			});
		} catch {
			return res.status(500).json({ error: "Server error" });
		}
	},
);

/* ------------------------------------------------------------
     PUT /api/posts/:id (update or soft delete)
------------------------------------------------------------ */
router.put(
	"/:id",
	requireAuth,
	async (
		req: Request<{ id: string }, PostUpdateResponse, Partial<PostBody> & { deleted?: boolean }>,
		res: Response<PostUpdateResponse>,
	) => {
		try {
			if (!req.user) return res.status(401).json({ message: "Unauthorized" });

			const postId = await resolvePostId(req.params.id);
			const postDoc = await Post.findById(postId);

			if (!postDoc) return res.status(404).json({ error: "Post not found" });
			if (postDoc.author.toString() !== req.user.userId)
				return res.status(403).json({ error: "Not authorized" });
			if (postDoc.deleted) return res.status(410).json({ error: "Post already deleted" });

			const { deleted, title, slug, locked, content, status } = req.body;

			if (deleted === true) {
				postDoc.deleted = true;
				await postDoc.save();

				const populated = (await postDoc.populate<{ author: IUserRef }>(
					"author",
					"name email",
				)) as PopulatedPost;

				return res.json(serializePost(populated));
			}

			const errors: Record<string, string> = {};
			if (title !== undefined && !title.trim()) errors["title"] = "Title is required";
			if (slug !== undefined && !slug.trim()) errors["slug"] = "Slug is required";
			if (content !== undefined && !content.trim()) errors["content"] = "Content is required";

			if (Object.keys(errors).length > 0) {
				return res.status(400).json({ message: "Validation error", errors });
			}

			if (slug !== undefined && slug.trim() !== postDoc.slug) {
				const canonical = slugifyFinal(slug);
				const finalSlug = canonical || `post-${Date.now()}`;

				const exists = await Post.findOne({
					slug: finalSlug,
					deleted: false,
					_id: { $ne: postId },
				}).lean();

				if (exists) {
					const suggestion = await Post.computeSuggestion(finalSlug);

					return res.status(409).json({
						message: "Slug already exists",
						errors: { slug: "Slug already exists" },
						suggestion,
					});
				}

				postDoc.slug = finalSlug;
			}

			if (title !== undefined) postDoc.title = title.trim();
			if (content !== undefined) postDoc.content = content;
			if (status !== undefined) postDoc.status = status;
			if (locked !== undefined) postDoc.locked = locked;

			await postDoc.save();

			const populated = (await postDoc.populate<{ author: IUserRef }>(
				"author",
				"name email",
			)) as PopulatedPost;

			return res.json(serializePost(populated));
		} catch (err) {
			if (err instanceof InvalidPostIdError)
				return res.status(400).json({ error: "Invalid post ID" });
			if (err instanceof PostNotFoundError)
				return res.status(404).json({ error: "Post not found" });

			if (isDuplicateError(err)) {
				return res.status(409).json({
					message: "Slug already exists",
					errors: { slug: "Slug already exists" },
				});
			}

			return res.status(500).json({ error: "Unable to update post" });
		}
	},
);

/* ------------------------------------------------------------
     GET /api/posts/trash/list
------------------------------------------------------------ */
router.get("/trash/list", requireAuth, async (req: Request, res: Response<PostDeleteResponse>) => {
	try {
		if (!req.user) return res.status(401).json({ message: "Unauthorized" });

		const userId = req.user.userId;
		const page = Math.max(1, Number(req.query["page"] ?? 1));
		const skip = (page - 1) * POSTS_PER_PAGE;

		const search =
			typeof req.query["search"] === "string" && req.query["search"].trim()
				? req.query["search"].trim()
				: undefined;

		const filter: Record<string, unknown> = {
			author: userId,
			deleted: true,
		};

		if (search) {
			const authorIds = await findAuthorIds(search);
			filter["$or"] = [
				{ title: { $regex: search, $options: "i" } },
				{ content: { $regex: search, $options: "i" } },
				...(authorIds.length > 0 ? [{ author: { $in: authorIds } }] : []),
			];
		}

		const [posts, totalDocs] = await Promise.all([
			Post.find(filter)
				.sort({ updatedAt: -1 })
				.skip(skip)
				.limit(POSTS_PER_PAGE)
				.populate<{ author: IUserRef }>("author", "name email")
				.lean()
				.exec()
				.then((rows) => rows as PopulatedPost[]),

			Post.countDocuments(filter),
		]);

		const totalPages = Math.max(1, Math.ceil(totalDocs / POSTS_PER_PAGE));

		return res.json({
			docs: posts.map(serializePost),
			pagination: {
				totalDocs,
				limit: POSTS_PER_PAGE,
				page,
				totalPages,
				hasNextPage: page < totalPages,
				hasPrevPage: page > 1,
				nextPage: page < totalPages ? page + 1 : null,
				prevPage: page > 1 ? page - 1 : null,
			},
		});
	} catch {
		return res.status(500).json({ message: "Unable to fetch trashed posts" });
	}
});

/* ------------------------------------------------------------
     GET /api/posts/:id (Post Detail)
------------------------------------------------------------ */
router.get("/:id", async (req: Request<{ id: string }>, res: Response<PostResponse>) => {
	try {
		const post = await Post.findById(req.params.id)
			.populate<{ author: IUserRef }>("author", "name email")
			.lean()
			.exec()
			.then((p) => p as PopulatedPost | null);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		return res.json(serializePost(post));
	} catch (err) {
		console.error("GET /posts/:id error:", err);
		return res.status(500).json({ error: "Failed to fetch post" });
	}
});

/* ------------------------------------------------------------
     POST /api/posts/:id/restore
------------------------------------------------------------ */
router.post(
	"/:id/restore",
	requireAuth,
	async (req: Request<{ id: string }>, res: Response<PostRestoreResponse>) => {
		try {
			if (!req.user) return res.status(401).json({ message: "Unauthorized" });

			const post = await Post.findOneAndUpdate(
				{ _id: req.params.id, author: req.user.userId, deleted: true },
				{ deleted: false },
				{ returnDocument: "after" },
			)
				.populate<{ author: IUserRef }>("author", "name email")
				.lean()
				.exec()
				.then((p) => p as PopulatedPost | null);

			if (!post) return res.status(404).json({ error: "Post not found or unauthorized" });

			return res.json(serializePost(post));
		} catch {
			return res.status(500).json({ message: "Failed to restore post" });
		}
	},
);

/* ------------------------------------------------------------
     POST /api/posts/:id/like
------------------------------------------------------------ */
router.post(
	"/:id/like",
	requireAuth,
	async (
		req: Request<{ id: string }, unknown, { userId?: string }>,
		res: Response<
			| {
					success: true;
					liked: boolean;
					likeCount: number;
					likedBy: string[];
					post: SerializedPost;
			  }
			| { success: false; message: string }
			| { error: string }
		>,
	) => {
		try {
			if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

			const postId = await resolvePostId(req.params.id);
			const userId = req.body.userId;

			if (!userId) return res.status(400).json({ success: false, message: "userId required" });

			const postDoc = await Post.findOne({
				_id: postId,
				deleted: false,
			}).populate<{ author: IUserRef }>("author", "name email");

			if (!postDoc) return res.status(404).json({ success: false, message: "Post not found" });

			if (postDoc.author._id.toString() === userId) {
				return res.status(403).json({
					success: false,
					message: "Authors cannot like their own posts",
				});
			}

			if (!Array.isArray(postDoc.likedBy)) postDoc.likedBy = [];

			const alreadyLiked = postDoc.likedBy.some((_id: Types.ObjectId) => _id.toString() === userId);

			if (alreadyLiked) {
				postDoc.likedBy = postDoc.likedBy.filter(
					(_id: Types.ObjectId) => _id.toString() !== userId,
				);
				postDoc.liked = false;
			} else {
				(postDoc.likedBy as Types.ObjectId[]).push(new Types.ObjectId(userId));
				postDoc.liked = true;
			}

			postDoc.likeCount = postDoc.likedBy.length;
			await postDoc.save();

			const populated = postDoc.toObject() as PopulatedPost;
			const serialized = serializePost(populated);

			return res.json({
				success: true,
				liked: serialized.liked,
				likeCount: serialized.likeCount,
				likedBy: serialized.likedBy,
				post: serialized,
			});
		} catch (err) {
			if (err instanceof InvalidPostIdError)
				return res.status(400).json({ error: "Invalid post ID" });
			if (err instanceof PostNotFoundError)
				return res.status(404).json({ error: "Post not found" });

			return res.status(500).json({ success: false, message: "Server error" });
		}
	},
);

export default router;
