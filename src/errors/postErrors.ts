//------------------------------------------------------------
// Exported error classes - `instanceof` for routes
//------------------------------------------------------------

export class PostNotFoundError extends Error {
	constructor() {
		super("Post not found");
		this.name = "PostNotFoundError";
	}
}

export class InvalidPostIdError extends Error {
	constructor() {
		super("Invalid post ID");
		this.name = "InvalidPostIdError";
	}
}
