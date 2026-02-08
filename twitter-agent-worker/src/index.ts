import { scrape } from "./scraper";
import { postReplies } from "./poster";

// Configuration
const SCRAPE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const POST_INTERVAL = 2 * 60 * 1000;    // 2 minutes

async function runWorker() {
    console.log("Starting Twitter Agent Worker...");

    // Initial run
    console.log("Performing initial scrape...");
    await scrape();

    // Schedule Scraper
    setInterval(async () => {
        console.log("Starting scheduled scrape...");
        await scrape();
    }, SCRAPE_INTERVAL);

    // Schedule Poster
    setInterval(async () => {
        console.log("Checking for replies to post...");
        await postReplies();
    }, POST_INTERVAL);

    console.log(`Worker loops started:
    - Scrape: Every ${SCRAPE_INTERVAL / 60000} mins
    - Post: Every ${POST_INTERVAL / 60000} mins`);
}

// Handle unhandled rejections to prevent crash
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

runWorker();
