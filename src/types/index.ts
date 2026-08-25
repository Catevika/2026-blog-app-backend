import type { Document, Types, HydratedDocument, Model } from "mongoose";

export type AppEnv = {
	NODE_ENV: "development" | "production" | "test" | string;
	PORT: string;
	MONGO_URI: string;
	ACCESS_TOKEN_SECRET: string;
	REFRESH_TOKEN_SECRET: string;
	ROTATE_REFRESH_TOKENS: string;
	VITEST: string;
	TEST_RATE_LIMITER: string;
	CORS_ORIGIN: string;
};

//------------------------------------------------------------
// TOKEN
//------------------------------------------------------------
export interface IRefreshTokenDoc extends Document {
	token: string;
	userId: string;
	rememberMe: boolean;
	expiresAt: Date;
	isValid: boolean;
}

export interface JwtPayload {
	userId: string;
	rememberMe?: boolean;
	verifyAccessToken: boolean;
}

//------------------------------------------------------------
// USER - IUser
//------------------------------------------------------------
export interface IUser {
	_id: Types.ObjectId;
	name: string;
	email: string;
	passwordHash: string;
	role: "user" | "admin";
	refreshToken?: string;
	createdAt: Date;
	updatedAt: Date;
}

// ------------------------------------------------------------
// USER - IUserRef
// ------------------------------------------------------------
export interface IUserRef {
	_id: Types.ObjectId;
	name: string;
	email: string;
}

// ------------------------------------------------------------
// USER - SerializedUser
// ------------------------------------------------------------

export interface SerializedUser {
	id: string;
	user: string;
	name: string;
	email: string;
	role: "user" | "admin";
	createdAt: Date;
	updatedAt: Date;
}

//------------------------------------------------------------
// POST - IPost
//------------------------------------------------------------
export interface IPost extends Document {
	_id: Types.ObjectId;
	title: string;
	slug: string;
	locked: boolean;
	content: string;
	author: Types.ObjectId | IUserRef;
	status: "draft" | "published";
	liked: boolean | false;
	likedBy: Types.ObjectId[] | [];
	likeCount: number | 0;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface PostModelStatics {
	computeSuggestion(base: string): Promise<string>;
}

export type PostModel = Model<IPost> & PostModelStatics;

//------------------------------------------------------------
// POST - PostBody / CREATE POST
//------------------------------------------------------------
export interface PostBody {
	title: string;
	slug: string;
	locked?: boolean;
	content: string;
	status: "draft" | "published";
	errors?: Record<string, string>;
}

//------------------------------------------------------------
// POST - PostQuery
//-----------------------------------------------------------
export type PostResponse = SerializedPost | { error: string };
export type PostFilter = {
	$or?: (
		| { title: { $regex: string; $options: string }; content?: never }
		| { content: { $regex: string; $options: string }; title?: never }
		| { author: { $in: Types.ObjectId[] } }
	)[];
	author?: string | Types.ObjectId;
	status?: "draft" | "published";
	deleted?: boolean;
};

export interface PostQuery {
	status?: "draft" | "published";
	deleted?: string;
	author?: string;
	page?: string;
	search?: string;
}

export type CheckSlugResponse = {
	available: boolean;
	suggestion: string | null;
};

export type CheckSlugQuery = {
	slug: string;
	excludeId?: string;
};

// -----------------------------
// SLUG - Duplicate error type guard
// -----------------------------
export type DuplicateError = {
	code?: number;
	keyPattern?: Record<string, unknown>;
};

// -----------------------------
// POST - Populated Post
// -----------------------------
export type PopulatedPost = IPost & {
	author: IUserRef;
};

// ------------------------------------------------------------
// SERIALIZED POST - Sent to Client
// ------------------------------------------------------------
export type SerializedPost = {
	id: string;
	title: string;
	slug: string;
	locked: boolean;
	content: string;
	author: { id: string; name: string; email: string };
	status: "draft" | "published";
	deleted: boolean;
	likeCount: number;
	liked: boolean;
	likedBy: string[];
	createdAt?: Date;
	updatedAt?: Date;
};

export interface PaginationInfo {
	totalDocs: number;
	limit: number;
	page: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
	nextPage: number | null;
	prevPage: number | null;
}

export interface PostsSuccessResponse {
	docs: SerializedPost[];
	pagination: PaginationInfo;
}

export interface PostsErrorResponse {
	error: string;
}

export type PostsResponse = PostsSuccessResponse | PostsErrorResponse;

export type PostCreateResponse =
	| SerializedPost
	| {
			message: string;
			suggestion?: string;
			errors?: Record<string, string>;
	  };

export type PostUpdateResponse =
	| SerializedPost
	| {
			message: string;
			suggestion?: string;
			errors?: Record<string, string>;
	  }
	| { error: string };

export type PostDeleteResponse =
	| {
			docs: SerializedPost[];
			pagination: {
				totalDocs: number;
				limit: number;
				page: number;
				totalPages: number;
				hasNextPage: boolean;
				hasPrevPage: boolean;
				nextPage: number | null;
				prevPage: number | null;
			};
	  }
	| { message: string };

export type PostRestoreResponse = SerializedPost | { error: string } | { message: string };

// ---------------------------------------------------------
// 	PDF
// ---------------------------------------------------------

export interface PdfRequestBody {
	postId?: string;
	title?: string;
}

// ---------------------------------------------------------
// 	COMMENT DOCUMENT (Mongoose)
// ---------------------------------------------------------

export interface IComment {
	_id: Types.ObjectId;
	postId: Types.ObjectId;
	author: Types.ObjectId;
	content: string;
	liked: boolean;
	likedBy: Types.ObjectId[];
	likeCount: number;
	parentId: Types.ObjectId | null;
	depth: number;
	deleted: boolean;
	createdAt: Date;
	updatedAt: Date;

	// Computed fields (not stored)
	replyCount?: number;
	replies?: IComment[];
}

export type CommentDoc = HydratedDocument<IComment>;

export type CommentValidationErrors = Partial<{
	content: string;
}>;

export type TreeComment = Omit<IComment, "replies"> & {
	replies: TreeComment[];
};

// ---------------------------------------------------------
// 	COMMENT REQUEST TYPES
// ---------------------------------------------------------

export interface CommentRequest {
	params: {
		postId: string;
		id: string;
	};
	body: {
		content: string;
		parentId?: string;
		deleted?: boolean;
	};
	user?: { userId: string; role?: string } | null;
}

// ---------------------------------------------------------
// 	POPULATED COMMENT
// ---------------------------------------------------------

export interface PopulatedAuthor {
	_id: Types.ObjectId;
	name?: string;
	email: string;
}

export type PopulatedComment = Omit<IComment, "author"> & {
	author: Types.ObjectId | PopulatedAuthor | null;
	replyCount?: number;
};

// ------------------------------------------------------------
// COMMENT DTO (serialized API shape)
// ------------------------------------------------------------

export interface SerializedComment {
	id: string;
	postId: string;

	authorId: string | null;
	author: {
		id: string;
		name?: string;
		email: string;
	} | null;

	content: string;
	liked: boolean;
	likedBy: string[];
	likeCount: number;

	parentId: string | null;
	depth: number;
	deleted: boolean;

	replyCount: number;
	hasReplies: boolean;

	replies?: SerializedComment[];

	createdAt: Date;
	updatedAt: Date;
}
