import { firefox } from "playwright";
import path from "path";
import fs from "fs";

const USER_DATA_DIR = path.join(process.cwd(), "twitter-session");

if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

async function login() {
    console.log("Launching Firefox for manual login...");
    console.log("Please log in to your Twitter account.");
    console.log("The browser will remain open for 5 minutes or until you close it.");

    const context = await firefox.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        viewport: { width: 1280, height: 720 },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/115.0", // Common Firefox UserAgent
        ignoreDefaultArgs: ["--enable-automation"]
    });

    const page = await context.newPage();

    // Simple stealth script
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    try {
        await page.goto("https://twitter.com/login");

        console.log("Waiting for user to close the browser...");
        // Poll loop to check if browser is still open
        try {
            while (context.pages().length > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (e) {
            // Context likely closed or disconnected
        }

        try {
            await context.close();
        } catch (e) {
            // already closed
        }
        console.log("Browser closed. Session saved to 'twitter-session' directory.");
    } catch (e) {
        console.log("Browser closed or error occurred:", e);
    } finally {
        // The context is already closed by the new logic, but keep this for robustness
        // in case an error occurs before the new close logic is reached.
        try {
            await context.close();
        } catch (e) {
            // Context might already be closed
        }
        console.log("Session saved.");
    }
}

login();
