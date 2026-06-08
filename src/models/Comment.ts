import type { Model } from "mongoose";
import mongoose, { Schema } from "mongoose";
import type { CommentDoc, IComment } from "../types/index.js";

const commentSchema = new Schema<IComment>(
	{
		postId: {
			type: Schema.Types.ObjectId,
			ref: "Post",
			required: true,
			index: true,
		},
		author: {
			type: Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		content: { type: String, required: true, trim: true },

		likedBy: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
		likeCount: { type: Number, default: 0 },

		parentId: {
			type: Schema.Types.ObjectId,
			ref: "Comment",
			default: null,
			index: true,
		},
		depth: { type: Number, default: 0 },

		deleted: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Keep likeCount consistent
commentSchema.pre("save", function (this: CommentDoc) {
	if (!Array.isArray(this.likedBy)) this.likedBy = [];
	this.likeCount = this.likedBy.length;
});

// Virtual replies
commentSchema.virtual("replies", {
	ref: "Comment",
	localField: "_id",
	foreignField: "parentId",
	justOne: false,
});

// Virtual id
commentSchema.virtual("id").get(function () {
	return this?._id ? this._id.toString() : undefined;
});

// Indexes
commentSchema.index({ postId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ postId: 1, depth: 1 });

export const Comment: Model<IComment> =
	mongoose.models["Comment"] ||
	mongoose.model<IComment>("Comment", commentSchema);
