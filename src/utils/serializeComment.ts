import { Types } from "mongoose";
import type {
	PopulatedAuthor,
	PopulatedComment,
	SerializedComment,
} from "../types/index.js";

function isPopulatedAuthor(
	author: PopulatedComment["author"]
): author is PopulatedAuthor {
	return (
		typeof author === "object" &&
		author !== null &&
		"_id" in author &&
		"email" in author
	);
}

export function serializeComment(
	comment: PopulatedComment,
	userId?: string | null
): SerializedComment {
	// Normalize likedBy → string[]
	const likedBy =
		Array.isArray(comment.likedBy) ?
			comment.likedBy.map((id: Types.ObjectId) => id.toString())
		:	[];

	const liked = userId ? likedBy.includes(userId) : false;

	const likeCount = likedBy.length;

	// Normalize replyCount
	const replyCount =
		typeof comment.replyCount === "number" ? comment.replyCount : 0;

	// Normalize authorId
	const authorId =
		isPopulatedAuthor(comment.author) ? comment.author._id.toString()
		: comment.author instanceof Types.ObjectId ? comment.author.toString()
		: null;

	// Normalize author object
	const author =
		isPopulatedAuthor(comment.author) ?
			{
				id: comment.author._id.toString(),
				name: comment.author.name ?? "",
				email: comment.author.email,
			}
		:	null;

	return {
		id: comment._id.toString(),
		postId: comment.postId.toString(),

		authorId,
		author,

		content: comment.content,
		liked,
		likedBy,
		likeCount,

		parentId: comment.parentId ? comment.parentId.toString() : null,

		depth: comment.depth,
		deleted: comment.deleted,

		replyCount,
		hasReplies: replyCount > 0,

		createdAt: comment.createdAt,
		updatedAt: comment.updatedAt,
	};
}
