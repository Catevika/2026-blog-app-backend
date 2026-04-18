import { describe, expect, it } from "vitest";
import * as config from "../../../src/config/index.js";

describe("config/index", () => {
	it("exports expected config values", () => {
		expect(config.ENV).toBeDefined();
		expect(config.AUTH).toBeDefined();
	});
});
