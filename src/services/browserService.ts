import type { Browser } from "puppeteer";
import puppeteer from "puppeteer";

export async function createBrowser(): Promise<Browser> {
	return puppeteer.launch({ headless: true });
}
