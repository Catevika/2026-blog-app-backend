import type { Browser, Page } from "puppeteer";
import type { Mock } from "vitest";
import { vi } from "vitest";

////------------------------------------------------------------
//  Returns a typed mock page and browser.
//	All runtime `unknown` casts are localized here.
//------------------------------------------------------------
export function createMockPuppeteer() {
	const page = {
		setExtraHTTPHeaders: vi.fn() as Mock<
			(headers: Record<string, string>) => void
		>,
		setViewport: vi.fn() as Mock<
			(viewport: { width: number; height: number }) => void
		>,
		goto: vi.fn().mockResolvedValue(undefined) as Mock<
			(url: string, options?: Parameters<Page["goto"]>[1]) => Promise<void>
		>,
		evaluate: vi.fn().mockResolvedValue(undefined) as Mock<
			(...args: Parameters<Page["evaluate"]>) => Promise<unknown>
		>,
		waitForSelector: vi.fn().mockResolvedValue(undefined) as Mock<
			(
				selector: string,
				options?: Parameters<Page["waitForSelector"]>[1]
			) => Promise<void>
		>,
		waitForNetworkIdle: vi.fn().mockResolvedValue(undefined) as Mock<
			(timeout?: number, options?: unknown) => Promise<void>
		>,
		pdf: vi.fn().mockResolvedValue(Buffer.from("fake-pdf-data")) as Mock<
			(options?: Parameters<Page["pdf"]>[0]) => Promise<Buffer>
		>,
	};

	const browser = {
		newPage: vi.fn().mockResolvedValue(page as unknown as Page) as Mock<
			() => Promise<Page>
		>,
		close: vi.fn().mockResolvedValue(undefined) as Mock<() => Promise<void>>,
	};

	return {
		page: page as unknown as Page,
		browser: browser as unknown as Browser,
		raw: { page, browser },
	};
}
