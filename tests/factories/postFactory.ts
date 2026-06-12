// tests/factories/postFactory.ts
import { Post } from "../../src/models/Post.js";
import { Types } from "mongoose";

interface CreateTestPostParams {
	author: {
		_id: Types.ObjectId;
		name: string;
		email: string;
	};
	title?: string;
	slug?: string;
	content?: string;
	status?: "published" | "draft";
	locked?: boolean;
}

export async function createTestPost({
	author,
	title = "Test Post",
	slug = `test-post-${Date.now()}`,
	content = "content",
	status = "published",
	locked = false,
}: CreateTestPostParams) {
	const post = await Post.create({
		title,
		slug,
		content,
		status,
		locked,
		deleted: false,
		author: author._id,
		likedBy: [],
		likeCount: 0,
	});

	const populated = await Post.findById(post._id).populate("author", "name email").lean();

	return populated!;
}
