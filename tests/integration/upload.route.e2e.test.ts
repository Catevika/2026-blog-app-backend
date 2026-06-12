import fs from "node:fs/promises";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loginTestUser } from "../helpers/authHelpers.js";

// Multer temp folder
const TMP = path.resolve("tmp/uploads/images");

// Final test upload folder (used by storeImageAtomic in test mode)
const TEST_UPLOAD_DIR = path.resolve("tmp/test-uploads/images");

// Test hashes file (used by storeImageAtomic in test mode)
const TEST_HASHES = path.resolve("tmp/test-uploads/.hashes.json");

async function ensure(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

async function clean(dir: string) {
	try {
		const files = await fs.readdir(dir);
		await Promise.all(
			files.map((f) => {
				if (f === ".gitkeep") return;
				return fs.rm(path.join(dir, f), { recursive: true, force: true });
			}),
		);
	} catch {
		throw new Error(`Failed to clean ${dir}`);
	}
}

describe("POST /api/upload/image (E2E)", () => {
	beforeEach(async () => {
		// Ensure directories exist
		await ensure(TMP);
		await ensure(TEST_UPLOAD_DIR);

		// Reset test hashes file
		await fs.writeFile(TEST_HASHES, "{}").catch(() => {});

		// Clean temp and test upload dirs
		await clean(TMP);
		await clean(TEST_UPLOAD_DIR);
	});

	afterEach(async () => {
		await clean(TMP);
		await clean(TEST_UPLOAD_DIR);
		await fs.writeFile(TEST_HASHES, "{}").catch(() => {});
	});

	it("uploads a real PNG end-to-end", async () => {
		const { agent } = await loginTestUser();

		const pngBase64 =
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
		const buf = Buffer.from(pngBase64, "base64");

		// Write temp file for Multer
		const tmpFile = path.join(TMP, `test-${Date.now()}.png`);
		await fs.writeFile(tmpFile, buf);

		const res = await agent.post("/api/upload/image").attach("image", tmpFile);

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);

		// Check final stored file in test upload directory
		const stored = path.join(TEST_UPLOAD_DIR, res.body.data.filename);
		const stat = await fs.stat(stored);
		expect(stat.isFile()).toBe(true);

		// Check test hashes file
		const hashes = JSON.parse(await fs.readFile(TEST_HASHES, "utf8"));
		const found = Object.values(hashes).some(
			(entry: any) => entry.filename === res.body.data.filename,
		);
		expect(found).toBe(true);
	});
});
