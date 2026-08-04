import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";

export async function createBrowser(): Promise<Browser> {
	return await puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
	});
}
