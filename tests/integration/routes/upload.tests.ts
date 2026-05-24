import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loginTestUser } from "../../helpers/authHelpers.js";
import request from "supertest";
import { app } from "../../setup/appTest.js";

const PUBLIC_UPLOADS = path.resolve(
	process.cwd(),
	"public",
	"uploads",
	"images"
);
const HASHES_PATH = path.join(PUBLIC_UPLOADS, ".hashes.json");
const TMP_UPLOADS = path.resolve(process.cwd(), "tmp", "uploads", "images");

type HashEntry = { filename: string; createdAt: string };
type HashesMap = Record<string, HashEntry>;

async function ensureDir(dir: string) {
	await fs.mkdir(dir, { recursive: true });
}

async function cleanupDir(dir: string) {
	try {
		const files = await fs.readdir(dir);
		await Promise.all(
			files.map(async (f) => {
				if (f === ".gitkeep") return;
				await fs.rm(path.join(dir, f), { force: true, recursive: true });
			})
		);
	} catch {}
}

describe("POST /api/upload/image (authenticated)", () => {
	beforeEach(async () => {
		await ensureDir(TMP_UPLOADS);
		await ensureDir(PUBLIC_UPLOADS);
		await fs.writeFile(HASHES_PATH, "{}", "utf8").catch(() => {});
		await cleanupDir(TMP_UPLOADS);
		await cleanupDir(PUBLIC_UPLOADS);
	});

	afterEach(async () => {
		await cleanupDir(TMP_UPLOADS);
		await cleanupDir(PUBLIC_UPLOADS);
		await fs.writeFile(HASHES_PATH, "{}", "utf8").catch(() => {});
	});

	it("accepts a PNG upload, stores file and updates .hashes.json when authenticated", async () => {
		const { agent } = await loginTestUser();

		// Minimal 1x1 PNG
		const pngBase64 =
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
		const pngBuffer = Buffer.from(pngBase64, "base64");

		// Write temp file
		const tmpFilePath = path.join(TMP_UPLOADS, `test-${Date.now()}.png`);
		await ensureDir(path.dirname(tmpFilePath));
		await fs.writeFile(tmpFilePath, pngBuffer);

		const res = await agent
			.post("/api/upload/image")
			.attach("image", tmpFilePath, {
				filename: "test.png",
				contentType: "image/png",
			});

		expect(res.status).toBe(200);
		expect(res.body.success).toBe(true);

		const data = res.body.data;
		expect(typeof data.filename).toBe("string");
		expect(typeof data.url).toBe("string");
		expect(typeof data.duplicate).toBe("boolean");

		// File should exist
		const storedPath = path.join(PUBLIC_UPLOADS, data.filename);
		const stat = await fs.stat(storedPath).catch(() => null);
		expect(stat?.isFile()).toBe(true);

		// Hashes file should contain the entry
		const hashesRaw = await fs.readFile(HASHES_PATH, "utf8").catch(() => "{}");
		const hashes = hashesRaw.trim() ? (JSON.parse(hashesRaw) as HashesMap) : {};

		const found = Object.values(hashes).some(
			(entry) => entry.filename === data.filename
		);
		expect(found).toBe(true);
	});

	it("rejects upload when not authenticated", async () => {
		const pngBase64 =
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
		const pngBuffer = Buffer.from(pngBase64, "base64");

		const tmpFilePath = path.join(TMP_UPLOADS, `unauth-${Date.now()}.png`);
		await fs.writeFile(tmpFilePath, pngBuffer);

		const res = await request(app)
			.post("/api/upload/image")
			.attach("image", tmpFilePath);

		expect(res.status).toBe(401); // or 403 depending on your auth middleware
		expect(res.body.success).toBe(false);
	});
});
