import { describe, it, beforeEach, expect, vi } from "vitest";
import { Post } from "../../../src/models/Post.js";
import * as slugUtils from "../../../src/utils/slugUtils.js";
import { mockFindResults } from "../../helpers/mongooseMocks.js";

describe("Post model unit tests and utilities", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("computeSuggestion returns canonical when no matches", async () => {
		mockFindResults(Post, []); // chainable mock for find().lean().exec()
		const canonical = slugUtils.slugifyFinal("Unique Title");
		const result = await Post.computeSuggestion("Unique Title");
		expect(result).toBe(canonical);
	});

	it("computeSuggestion returns incremented suffix when matches exist", async () => {
		const matches = [{ slug: "foo" }, { slug: "foo-1" }, { slug: "foo-3" }];
		mockFindResults(Post, matches);
		const result = await Post.computeSuggestion("Foo");
		expect(result).toBe("foo-4");
	});

	it("computeSuggestion falls back to post-<timestamp> when slugifyFinal returns empty", async () => {
		const spy = vi.spyOn(slugUtils, "slugifyFinal").mockReturnValue("");
		mockFindResults(Post, []);
		const result = await Post.computeSuggestion("!!!");
		expect(result.startsWith("post-")).toBe(true);
		spy.mockRestore();
	});

	it("computeSuggestion propagates DB errors (find rejects)", async () => {
		vi.spyOn(Post, "find").mockReturnValue({
			lean: () => ({ exec: () => Promise.reject(new Error("db failure")) }),
		} as any);

		await expect(Post.computeSuggestion("Anything")).rejects.toThrow(
			"db failure"
		);
	});

	it("slugifyFinal normalizes strings and returns empty for invalid input", () => {
		expect(slugUtils.slugifyFinal("Hello World")).toBe("hello-world");
		expect(slugUtils.slugifyFinal("  ")).toBe("");
		expect(slugUtils.slugifyFinal("This & That")).toContain("this-that");
	});
});
