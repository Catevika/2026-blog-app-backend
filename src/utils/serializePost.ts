import type { PopulatedPost, SerializedPost } from "../types/index.js";

export function serializePost(post: PopulatedPost): SerializedPost {
	return {
		id: post._id.toString(),
		title: post.title,
		slug: post.slug,
		content: post.content,
		locked: post.locked,
		status: post.status,
		deleted: post.deleted,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt,
		likeCount: post.likeCount,
		liked: post.liked ?? false,
		likedBy: post.likedBy?.map((id) => id.toString()) ?? [],
		author: {
			id: post.author._id.toString(),
			name: post.author.name,
			email: post.author.email,
		},
	};
}
