import mongoose, { Schema } from "mongoose";
import type { IPost, PostModel } from "../types/index.js";
import { slugifyFinal } from "../utils/slugUtils.js";

const postSchema = new Schema<IPost, PostModel>(
	{
		title: {
			type: String,
			required: true,
			minlength: 1,
			maxlength: 200,
			trim: true,
		},
		slug: {
			type: String,
			required: true,
			minlength: 1,
			maxlength: 50,
			trim: true,
			lowercase: true,
		},
		locked: { type: Boolean, default: true },
		content: { type: String, required: true, minlength: 1 },
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		status: {
			type: String,
			enum: ["draft", "published"],
			default: "draft",
			index: true,
		},
		liked: { type: Boolean, default: false },
		likedBy: [{ type: Schema.Types.ObjectId, ref: "User", default: [] }],
		likeCount: { type: Number, default: 0, min: 0 },
		deleted: { type: Boolean, default: false, index: true },
	},
	{ timestamps: true }
);

postSchema.index(
	{ slug: 1 },
	{ unique: true, partialFilterExpression: { deleted: false } }
);

postSchema.pre("save", function () {
	this.likeCount = (this.likedBy ?? []).length;
});

postSchema.virtual("authorId").get(function () {
	return this.author?._id ?? this.author;
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

postSchema.pre("save", function () {
	if (!this.slug && this.title) {
		this.slug = slugifyFinal(this.title);
	} else if (this.slug) {
		this.slug = slugifyFinal(this.slug);
	}
});

postSchema.statics["computeSuggestion"] = async function (
	this: PostModel,
	base: string
): Promise<string> {
	const canonical = slugifyFinal(base);
	if (!canonical) return `post-${Date.now()}`;

	const regex = new RegExp(`^${canonical}(-\\d+)?$`);
	const matches = await this.find(
		{ slug: { $regex: regex }, deleted: false },
		{ slug: 1 }
	)
		.lean()
		.exec();

	if (!matches || matches.length === 0) return canonical;

	let max = 0;
	for (const m of matches) {
		const s = (m as { slug: string }).slug;
		if (!s) continue;
		if (s === canonical) {
			max = Math.max(max, 1);
			continue;
		}
		const parts = s.split("-");
		const last = parts[parts.length - 1];
		const n = last ? parseInt(last, 10) : 0;
		if (!Number.isNaN(n)) max = Math.max(max, n);
	}

	return max > 0 ? `${canonical}-${max + 1}` : canonical;
};

export const Post =
	(mongoose.models["Post"] as PostModel) ||
	(mongoose.model<IPost, PostModel>("Post", postSchema) as PostModel);
