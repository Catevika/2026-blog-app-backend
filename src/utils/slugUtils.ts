import type mongoose from "mongoose";

export function slugifyFinal(input: string): string {
	if (!input) return "";
	return input
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/[\s_]+/g, "-")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 50);
}

export async function computeSlugSuggestion(
	model: mongoose.Model<unknown> & {
		computeSuggestion?: (base: string) => Promise<string>;
	},
	base: string,
): Promise<string> {
	if (typeof model.computeSuggestion === "function") {
		return model.computeSuggestion(base);
	}

	const canonical = slugifyFinal(base);
	if (!canonical) return `post-${Date.now()}`;

	const regex = new RegExp(`^${canonical}(-\\d+)?$`);
	const matches = await model
		.find({ slug: { $regex: regex }, deleted: false }, { slug: 1 })
		.lean()
		.exec();

	if (!matches || matches.length === 0) return canonical;

	let max = 0;
	for (const m of matches) {
		const s = (m as unknown as { slug: string }).slug;
		if (s === canonical) {
			max = Math.max(max, 1);
			continue;
		}

		const parts = s.split("-");
		if (parts.length < 2) continue;

		const last = parts[parts.length - 1];
		if (!last) continue;

		const n = parseInt(last, 10);
		if (!Number.isNaN(n)) max = Math.max(max, n);
	}

	return max > 0 ? `${canonical}-${max + 1}` : canonical;
}
