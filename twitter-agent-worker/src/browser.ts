import { firefox, BrowserContext } from "playwright";
import path from "path";
import fs from "fs";

const USER_DATA_DIR = path.join(process.cwd(), "twitter-session");

export async function getContext(): Promise<BrowserContext> {
    if (!fs.existsSync(USER_DATA_DIR)) {
        fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }

    const context = await firefox.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0",
        ignoreDefaultArgs: ["--enable-automation"]
    });

    return context;
}

export async function closeContext(context: BrowserContext) {
    await context.close();
}
