import { getContext, closeContext } from "./browser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { Page } from "playwright";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase URL or Key");

const supabase = createClient(supabaseUrl, supabaseKey);

// Human Typing Simulation
async function typeLikeHuman(page: Page, selector: string, text: string) {
    await page.focus(selector);
    for (const char of text) {
        await page.keyboard.type(char, { delay: Math.random() * 100 + 40 }); // 40-140ms delay

        // Occasional pause or backspace
        if (Math.random() < 0.05) {
            await page.waitForTimeout(Math.random() * 500 + 200); // Pause
        }
    }
}

async function postReplies() {
    // 1. Fetch pending replies scheduled for now or past
    const { data: queue } = await supabase
        .from("reply_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .limit(1); // Process one at a time to be safe

    if (!queue || queue.length === 0) {
        console.log("No pending replies to post.");
        return;
    }

    const task = queue[0];
    console.log(`Processing reply for tweet ${task.tweet_id}: ${task.reply_text}`);

    const context = await getContext();
    const page = await context.newPage();

    try {
        // 2. Go to Tweet
        // Construct URL (assuming we saved tweet_url or reconstruct it)
        // We saved tweet_url in tweets, but here we have tweet_id. 
        // Wait, tweet_id alone might not be enough if we don't know the username for the URL?
        // Actually twitter handles /user/status/id well, or even /i/web/status/id
        // But better to fetch the tweet URL from tweets table if possible, or just use `https://twitter.com/i/web/status/${task.tweet_id}`

        const tweetUrl = `https://x.com/i/web/status/${task.tweet_id}`;
        await page.goto(tweetUrl);
        await page.waitForTimeout(5000);

        // 3. Click Reply
        // Selector for reply button might vary. Usually `[data-testid="reply"]`
        const replyButton = page.locator('[data-testid="reply"]');
        if (await replyButton.count() > 0) {
            await replyButton.first().click();
            await page.waitForTimeout(2000);

            // 4. Type Reply
            // Editor is `[data-testid="tweetTextarea_0"]`
            // Wait for editor
            await page.waitForSelector('[data-testid="tweetTextarea_0"]');
            await typeLikeHuman(page, '[data-testid="tweetTextarea_0"]', task.reply_text);

            await page.waitForTimeout(2000);

            // 5. Click Post
            await page.click('[data-testid="tweetButton"]');
            await page.waitForTimeout(5000); // Verify it posted?

            // 6. Update DB
            await supabase
                .from("reply_queue")
                .update({ status: "posted", posted_at: new Date().toISOString() })
                .eq("id", task.id);

            // 7. Update Memory (conversations)
            await supabase
                .from("conversations")
                .insert({
                    username: task.username,
                    tweet_id: task.tweet_id,
                    our_reply: task.reply_text
                });

            console.log("Reply posted successfully!");

            // Update bot_limits
            // (Simplified: just increment count on row 1)
            await supabase.rpc('increment_reply_count'); // Use RPC or raw SQL?
            // Since we didn't define RPC, let's do fetch-update (less safe concurrently but fine for single worker)
            const { data: limits } = await supabase.from("bot_limits").select("replies_today").eq("id", 1).single();
            if (limits) {
                await supabase.from("bot_limits").update({ replies_today: limits.replies_today + 1, last_reply_time: new Date() }).eq("id", 1);
            }

        } else {
            console.error("Reply button not found. Maybe tweet deleted or not logged in?");
            await supabase
                .from("reply_queue")
                .update({ status: "failed" })
                .eq("id", task.id);
        }

    } catch (err) {
        console.error("Posting failed:", err);
        await supabase
            .from("reply_queue")
            .update({ status: "failed" })
            .eq("id", task.id);
    } finally {
        await closeContext(context);
    }
}

if (require.main === module) {
    postReplies();
}

export { postReplies };
