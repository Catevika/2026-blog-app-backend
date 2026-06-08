import type { CommentValidationErrors } from "../types/index.js";

export const validateCommentData = (
	content: unknown
): CommentValidationErrors => {
	const errors: CommentValidationErrors = {};

	// Must be a string
	if (typeof content !== "string") {
		errors.content = "Invalid content";
		return errors;
	}

	const trimmed = content.trim();

	// Required
	if (trimmed.length === 0) {
		errors.content = "Content is required";
		return errors;
	}

	// Minimum length (optional but recommended)
	if (trimmed.length < 2) {
		errors.content = "Comment is too short";
		return errors;
	}

	// Maximum length
	if (trimmed.length > 5000) {
		errors.content = "Content is too long";
		return errors;
	}

	return errors;
};
