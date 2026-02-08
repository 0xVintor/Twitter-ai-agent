import { getContext, closeContext } from "./browser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase URL or Key");

const supabase = createClient(supabaseUrl, supabaseKey);

const SEARCH_QUERIES = [
    "startup founder",
    "saas",
    "indie hacker",
    "ai tools",
    "bootstrapped"
];

async function scrape() {
    const context = await getContext();
    const page = await context.newPage();

    try {
        for (const query of SEARCH_QUERIES) {
            console.log(`Searching for: ${query}`);
            // Search for latest tweets
            await page.goto(`https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`);
            await page.waitForTimeout(5000); // Wait for load

            // Scroll a bit to load more
            await page.evaluate(() => window.scrollBy(0, 1000));
            await page.waitForTimeout(3000);

            // Extract tweets
            const tweets = await page.evaluate(() => {
                const articles = document.querySelectorAll('article');
                return Array.from(articles).map(article => {
                    const userEl = article.querySelector('div[data-testid="User-Name"]');
                    const textEl = article.querySelector('div[data-testid="tweetText"]');
                    const timeEl = article.querySelector('time');
                    const linkEl = article.querySelector('a[href*="/status/"]');

                    if (!userEl || !textEl || !timeEl || !linkEl) return null;

                    const username = (userEl.textContent?.match(/@(\w+)/) || [])[1];
                    const text = textEl.textContent || "";
                    const tweetUrl = (linkEl as HTMLAnchorElement).href;
                    const tweetId = tweetUrl.split('/').pop() || "";

                    // Basic metrics (optional, tricky to get reliably without more complex selectors)
                    // For now, default to 0

                    return {
                        tweet_id: tweetId,
                        username: username || "unknown",
                        text,
                        tweet_url: tweetUrl,
                        likes: 0,
                        followers: 0
                    };
                }).filter(t => t !== null);
            });

            console.log(`Found ${tweets.length} tweets for "${query}"`);

            // Insert into DB
            for (const tweet of tweets) {
                if (!tweet) continue;

                const { error } = await supabase
                    .from("tweets")
                    .upsert(tweet, { onConflict: 'tweet_id', ignoreDuplicates: true });

                if (error) console.error("Error inserting tweet:", error);
            }

            // Random pause between queries
            await page.waitForTimeout(Math.random() * 5000 + 2000);
        }
    } catch (err) {
        console.error("Scraping failed:", err);
    } finally {
        await closeContext(context);
    }
}

// Run if called directly
if (require.main === module) {
    scrape();
}

export { scrape };
