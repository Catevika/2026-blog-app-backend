import { Types } from "mongoose";
import { InvalidPostIdError, PostNotFoundError } from "../errors/postErrors.js";
import { Post } from "../models/Post.js";
import { slugifyFinal } from "./slugUtils.js";

type ResolveOptions = {
	preferSlug?: boolean;
};

/**
 * Resolve a raw identifier (id, slug, or URL/path) to a canonical post _id string.
 * Throws InvalidPostIdError or PostNotFoundError so callers can handle them explicitly.
 */
export async function resolvePostId(raw: string, options: ResolveOptions = {}): Promise<string> {
	if (!raw || typeof raw !== "string") {
		throw new InvalidPostIdError();
	}

	const trimmed = raw.trim();
	const lastSegment = (() => {
		try {
			const maybeUrl = new URL(trimmed);
			return maybeUrl.pathname.split("/").filter(Boolean).pop() ?? trimmed;
		} catch {
			return trimmed.split("/").filter(Boolean).pop() ?? trimmed;
		}
	})();

	const candidate = lastSegment;
	const slug = slugifyFinal(candidate);
	const isObjectId = Types.ObjectId.isValid(candidate);

	const useSlugLookup = !!options.preferSlug || !isObjectId;

	const query = useSlugLookup
		? { slug, deleted: false }
		: { _id: new Types.ObjectId(candidate), deleted: false };

	const post = await Post.findOne(query).lean().exec();

	if (!post) {
		// If we tried ObjectId lookup and failed, fall back to slug lookup (unless preferSlug)
		if (!useSlugLookup && !options.preferSlug) {
			const fallback = await Post.findOne({ slug, deleted: false }).lean().exec();
			if (fallback) return fallback._id.toString();
		}
		throw new PostNotFoundError();
	}

	return post._id.toString();
}
