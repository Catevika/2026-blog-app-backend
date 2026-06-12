import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const IS_TEST = process.env["NODE_ENV"] === "test";

const UPLOAD_DIR = IS_TEST
	? path.resolve(process.cwd(), "tmp", "test-uploads", "images")
	: path.resolve(process.cwd(), "public", "uploads", "images");

const HASHES_FILE = IS_TEST
	? path.resolve(process.cwd(), "tmp", "test-uploads", ".hashes.json")
	: path.join(UPLOAD_DIR, ".hashes.json");

type StoreResult = { filename: string; duplicate: boolean };

async function ensureUploadDir() {
	await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function extFromOriginal(originalName: string) {
	const ext = path.extname(originalName || "").toLowerCase();
	return ext || ".jpg";
}

export async function storeImageAtomic(buffer: Buffer, originalName: string): Promise<StoreResult> {
	await ensureUploadDir();

	const hash = crypto.createHash("sha256").update(buffer).digest("hex");
	const ext = extFromOriginal(originalName);
	const filename = `${hash}${ext}`;
	const filePath = path.join(UPLOAD_DIR, filename);

	let hashes: Record<string, { filename: string; createdAt: string }>;
	try {
		const raw = await fs.readFile(HASHES_FILE, "utf8").catch(() => "{}");
		hashes = JSON.parse(raw || "{}");
	} catch (err) {
		console.warn("Failed to parse .hashes.json, recreating:", err);
		hashes = {};
	}

	if (hashes[hash]) {
		return { filename: hashes[hash].filename, duplicate: true };
	}

	try {
		await fs.access(filePath).catch(async () => {
			await fs.writeFile(filePath, buffer, { mode: 0o644 });
		});

		hashes[hash] = { filename, createdAt: new Date().toISOString() };

		const tmpPath = `${HASHES_FILE}.tmp`;
		await fs.writeFile(tmpPath, JSON.stringify(hashes, null, 2), { mode: 0o600 });
		await fs.rename(tmpPath, HASHES_FILE);

		return { filename, duplicate: false };
	} catch (err) {
		await fs.unlink(filePath).catch(() => {});
		throw err;
	}
}
