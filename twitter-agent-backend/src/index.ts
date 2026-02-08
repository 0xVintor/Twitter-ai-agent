import express from "express";
import dotenv from "dotenv";
import { supabase } from "./lib/supabase";
import { classifyTweet } from "./services/classification";
import { generateReply } from "./services/reply";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Poll for new tweets every 3 minutes
const POLL_INTERVAL = 3 * 60 * 1000;

async function processNewTweets() {
    console.log("Checking for new tweets...");

    // 1. Fetch unprocess tweets
    const { data: tweets, error } = await supabase
        .from("tweets")
        .select("*")
        .eq("scored", false)
        .limit(10);

    if (error) {
        console.error("Error fetching tweets:", error);
        return;
    }

    if (!tweets || tweets.length === 0) {
        console.log("No new tweets to process.");
        return;
    }

    for (const tweet of tweets) {
        console.log(`Processing tweet: ${tweet.tweet_id}`);

        // 2. Classify
        const classification = await classifyTweet(tweet.text, tweet.username);

        // Update tweet with score
        await supabase
            .from("tweets")
            .update({
                scored: true,
                should_reply: classification.should_reply,
                engagement_score: classification.engagement_score,
                tweet_type: classification.tweet_type
            })
            .eq("tweet_id", tweet.tweet_id);

        if (classification.should_reply && classification.engagement_score >= 70) {
            console.log(`-> High score (${classification.engagement_score}). Generating reply...`);

            // 3. Generate Reply
            const replyText = await generateReply(tweet.text, tweet.username, tweet.tweet_id);

            if (replyText) {
                // 4. Schedule
                // Random delay 6 to 90 minutes
                const delayMinutes = Math.floor(Math.random() * (90 - 6 + 1)) + 6;
                const scheduledFor = new Date(Date.now() + delayMinutes * 60000);

                await supabase
                    .from("reply_queue")
                    .insert({
                        tweet_id: tweet.tweet_id,
                        username: tweet.username,
                        reply_text: replyText,
                        status: "pending",
                        scheduled_for: scheduledFor
                        // posted_at is null
                    });

                console.log(`-> Reply scheduled for ${scheduledFor.toISOString()}`);
            } else {
                console.log("-> Failed to generate safe reply.");
            }
        } else {
            console.log(`-> Skipped (Score: ${classification.engagement_score})`);
        }
    }
}

// Start processing loop
setInterval(processNewTweets, POLL_INTERVAL);

// Initial run
processNewTweets();

app.get("/health", (req, res) => {
    res.send("Twitter Agent Backend is running.");
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
