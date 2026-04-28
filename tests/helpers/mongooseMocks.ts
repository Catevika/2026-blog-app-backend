import { vi } from "vitest";

/**
 * Helpers to mock common Mongoose query chains in unit tests.
 * Each helper returns a spy so tests can assert calls if needed.
 *
 * Usage:
 *   import { mockFindResults, mockFindByIdPopulateLeanExec } from "../helpers/mongooseMocks";
 *   mockFindResults(Post, [{ slug: "foo" }]);
 *   mockFindByIdPopulateLeanExec(Post, populatedDoc);
 */

/* Mock Post.find(...).lean().exec() */
export function mockFindResults(model: any, results: unknown) {
	return vi.spyOn(model, "find").mockReturnValue({
		lean: () => ({ exec: () => Promise.resolve(results) }),
	} as any);
}

/* Mock Post.findById(...).populate(...).lean().exec() */
export function mockFindByIdPopulateLeanExec(model: any, result: unknown) {
	return vi.spyOn(model, "findById").mockReturnValue({
		populate: () => ({ lean: () => ({ exec: () => Promise.resolve(result) }) }),
	} as any);
}

/* Mock Post.findOne(...).lean().exec() */
export function mockFindOneLeanExec(model: any, result: unknown) {
	return vi.spyOn(model, "findOne").mockReturnValue({
		lean: () => ({ exec: () => Promise.resolve(result) }),
	} as any);
}

/* Mock Post.exists(...) -> resolves to boolean or doc-like */
export function mockExists(model: any, result: unknown) {
	return vi.spyOn(model, "exists").mockResolvedValue(result as any);
}

/* Mock a method to reject (simulate DB error) */
export function mockMethodRejects(
	model: any,
	methodName: string,
	err: unknown
) {
	return vi.spyOn(model, methodName as any).mockRejectedValue(err);
}
