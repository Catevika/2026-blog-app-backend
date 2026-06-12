// tests/factories/commentFactory.ts
import { Comment } from "../../src/models/Comment.js";
import { Types } from "mongoose";

interface CreateTestCommentParams {
	post: { _id: Types.ObjectId };
	author: { _id: Types.ObjectId; name: string; email: string };
	content?: string;
	parent?: { _id: Types.ObjectId } | null;
	deleted?: boolean;
}

export async function createTestComment({
	post,
	author,
	content = "hello",
	parent = null,
	deleted = false,
}: CreateTestCommentParams) {
	const comment = await Comment.create({
		postId: post._id,
		author: author._id,
		content,
		parentId: parent?._id ?? null,
		deleted,
		likedBy: [],
		likeCount: 0,
	});

	const populated = await Comment.findById(comment._id).populate("author", "name email").lean();

	return populated!;
}
