import { Request, Response, Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/requireAuth.js";
import { Comment } from "../models/Comment.js";
import {
	CommentRequest,
	SerializedComment,
	TreeComment,
} from "../types/index.js";
import { resolvePostId } from "../utils/resolvePostId.js";
import { serializeComment } from "../utils/serializeComment.js";
import { toObjectId } from "../utils/toObjectId.js";
import { validateCommentData } from "../utils/validateCommentData.js";

const router = Router({ mergeParams: true });

/* -------------------------------------------------------
   Helper — Normalize Express params (TS-safe)
------------------------------------------------------- */
function normalizeParam(param: string | string[] | undefined): string | null {
	if (Array.isArray(param)) return param[0] ?? null;
	if (typeof param === "string") return param;
	return null;
}

/* -------------------------------------------------------
   GET /api/posts/:postId/comments
------------------------------------------------------- */
router.get("/", async (req: Request, res: Response) => {
	try {
		const rawPostId = normalizeParam(req.params["postId"]);

		if (!rawPostId || !Types.ObjectId.isValid(rawPostId)) {
			return res.status(400).json({ error: "Invalid post ID" });
		}

		await resolvePostId(rawPostId);
		const postId = toObjectId(rawPostId);

		const comments = await Comment.find({ postId })
			.sort({ createdAt: 1 })
			.populate("author", "name email")
			.lean();

		const userId = req.user?.userId ?? null;

		return res.json({
			comments: comments.map((c) => serializeComment(c, userId)),
		});
	} catch (error) {
		console.error("Fetch comments failed:", error);
		return res.status(500).json({ error: "Unable to fetch comments" });
	}
});

/* -------------------------------------------------------
   GET /api/posts/:postId/comments/tree
------------------------------------------------------- */
router.get("/tree", async (req: Request, res: Response) => {
	try {
		const rawPostId = normalizeParam(req.params["postId"]);

		if (!rawPostId || !Types.ObjectId.isValid(rawPostId)) {
			return res.status(400).json({ error: "Invalid post ID" });
		}

		await resolvePostId(rawPostId);
		const postId = toObjectId(rawPostId);

		const comments = (await Comment.find({ postId })
			.sort({ createdAt: 1 })
			.populate("author", "name email")
			.lean()) as TreeComment[];

		const map = new Map<string, TreeComment>();
		comments.forEach((c) => {
			c.replies = [];
			map.set(c._id.toString(), c);
		});

		const roots: TreeComment[] = [];
		comments.forEach((c) => {
			const id = c._id.toString();
			const parentId = c.parentId?.toString();

			if (parentId && map.has(parentId)) {
				map.get(parentId)!.replies.push(map.get(id)!);
			} else {
				roots.push(map.get(id)!);
			}
		});

		const userId = req.user?.userId ?? null;

		function serializeTree(node: TreeComment): SerializedComment {
			const serialized = serializeComment(node, userId);

			serialized.replies = node.replies
				.filter((r) => !r.deleted)
				.map(serializeTree);

			return serialized;
		}

		return res.json({
			comments: roots.map(serializeTree),
		});
	} catch (error) {
		console.error("Tree fetch failed:", error);
		return res.status(500).json({ error: "Unable to fetch comment tree" });
	}
});

/* -------------------------------------------------------
   POST /api/posts/:postId/comments
------------------------------------------------------- */
router.post("/", requireAuth, async (req: Request, res: Response) => {
	try {
		const rawPostId = normalizeParam(req.params["postId"]);

		if (!rawPostId || !Types.ObjectId.isValid(rawPostId)) {
			return res.status(400).json({ error: "Invalid post ID" });
		}

		await resolvePostId(rawPostId);
		const postId = toObjectId(rawPostId);

		const userId = req.user!.userId;

		const { content, parentId } = req.body;

		const errors = validateCommentData(content);
		if (errors.content) {
			return res.status(400).json({ errors });
		}

		const normalizedParentId =
			typeof parentId === "string" && Types.ObjectId.isValid(parentId) ?
				toObjectId(parentId)
			:	null;

		const comment = await Comment.create({
			postId,
			author: userId,
			content: content.trim(),
			parentId: normalizedParentId,
		});

		const populated = await Comment.findById(comment._id)
			.populate("author", "name email")
			.lean();

		return res.status(201).json({
			comment: serializeComment(populated!, userId),
		});
	} catch (error) {
		console.error("Create comment failed:", error);
		return res.status(500).json({ error: "Unable to create comment" });
	}
});

/* -------------------------------------------------------
   POST /api/posts/:postId/comments/:id/like
------------------------------------------------------- */
router.post("/:id/like", requireAuth, async (req: Request, res: Response) => {
	try {
		const rawId = normalizeParam(req.params["id"]);

		if (!rawId || !Types.ObjectId.isValid(rawId)) {
			return res.status(400).json({ error: "Invalid comment ID" });
		}

		const commentId = toObjectId(rawId);
		const userId = req.user!.userId;

		const comment = await Comment.findById(commentId)
			.populate("author", "name email")
			.exec();

		if (!comment || comment.deleted) {
			return res.status(404).json({ error: "Comment not found" });
		}

		if (comment.author?._id?.toString() === userId) {
			return res.status(403).json({
				success: false,
				message: "Authors cannot like their own comments",
			});
		}

		const likedBy = comment.likedBy.map((id) => id.toString());
		const alreadyLiked = likedBy.includes(userId);

		if (alreadyLiked) {
			comment.likedBy = comment.likedBy.filter(
				(id) => id.toString() !== userId
			);
		} else {
			comment.likedBy.push(new Types.ObjectId(userId));
		}

		await comment.save();

		const serialized = serializeComment(comment.toObject(), userId);

		return res.json({
			success: true,
			liked: !alreadyLiked,
			likeCount: serialized.likeCount,
			likedBy: serialized.likedBy,
			comment: serialized,
		});
	} catch (error) {
		console.error("Toggle like failed:", error);
		return res.status(500).json({ error: "Unable to toggle like" });
	}
});

/* -------------------------------------------------------
   PUT /api/posts/:postId/comments/:id
------------------------------------------------------- */
router.put("/:id", requireAuth, async (req: CommentRequest, res: Response) => {
	try {
		const rawId = normalizeParam(req.params["id"]);
		const rawPostId = normalizeParam(req.params["postId"]);

		if (
			!rawId ||
			!Types.ObjectId.isValid(rawId) ||
			!rawPostId ||
			!Types.ObjectId.isValid(rawPostId)
		) {
			return res.status(400).json({ error: "Invalid ID" });
		}

		const commentId = toObjectId(rawId);
		const postId = toObjectId(rawPostId);
		const userId = req.user?.userId;

		const { content } = req.body;

		/* -------------------------
       VALIDATION INSERTED HERE
    ------------------------- */
		const errors = validateCommentData(content);
		if (errors.content) {
			return res.status(400).json({ errors });
		}

		const comment = await Comment.findOne({ _id: commentId, postId });

		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		if (comment.author.toString() !== userId) {
			return res.status(403).json({ error: "Not allowed" });
		}

		comment.content = content.trim();
		comment.updatedAt = new Date();

		await comment.save();

		const populated = await Comment.findById(comment._id)
			.populate("author", "name email")
			.lean();

		if (!populated) {
			return res.status(500).json({ error: "Unable to update comment" });
		}

		const serialized = serializeComment(populated, userId);

		return res.json({
			success: true,
			comment: serialized,
		});
	} catch (error) {
		console.error("Update comment failed:", error);
		return res.status(500).json({ error: "Unable to update comment" });
	}
});

/* -------------------------------------------------------
   DELETE /api/posts/:postId/comments/:id
------------------------------------------------------- */
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
	try {
		const rawId = normalizeParam(req.params["id"]);
		const rawPostId = normalizeParam(req.params["postId"]);

		if (
			!rawId ||
			!Types.ObjectId.isValid(rawId) ||
			!rawPostId ||
			!Types.ObjectId.isValid(rawPostId)
		) {
			return res.status(400).json({ error: "Invalid ID" });
		}

		const commentId = toObjectId(rawId);
		const postId = toObjectId(rawPostId);
		const userId = req.user!.userId;

		const comment = await Comment.findOne({ _id: commentId, postId });

		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		if (comment.author.toString() !== userId) {
			return res.status(403).json({ error: "Not allowed" });
		}

		comment.deleted = true;
		comment.content = "[deleted]";
		await comment.save();

		const serialized = serializeComment(comment.toObject(), userId);

		return res.json({
			success: true,
			comment: serialized,
		});
	} catch (error) {
		console.error("Delete comment failed:", error);
		return res.status(500).json({ error: "Unable to delete comment" });
	}
});

export default router;
