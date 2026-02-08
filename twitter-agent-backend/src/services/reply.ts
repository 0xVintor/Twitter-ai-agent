import { ai } from "../lib/gemini";
import { supabase } from "../lib/supabase";

export async function generateReply(tweetText: string, username: string, tweetId: string): Promise<string | null> {
    // 1. Fetch Memory
    const { data: pastConversations } = await supabase
        .from("conversations")
        .select("our_reply, tweet_id")
        .eq("username", username)
        .order("created_at", { ascending: false })
        .limit(5);

    const historyContext = pastConversations?.map((c: { our_reply: any; }) => `Us: ${c.our_reply}`).join("\n") || "";

    // 2. Generate Reply (Gemini Pro)
    // Note: Model name might need adjustment if "gemini-2.0-pro-exp-02-05" is strictly required but SDK doesn't support it yet,
    // usually "gemini-pro" or "gemini-1.5-pro" works. For now sticking to user request but fallback might be needed.
    // Actually, for consistency with public API, let's use "gemini-pro" or "gemini-1.5-pro-latest" if 2.0 fails, but user asked for 2.0.
    // I will use "gemini-pro" generally or specific model if available.
    // User requested: video-2.0-flash / 2.0-pro. I'll stick to string.
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    You are Vintor, a startup founder.
    Your Voice: Casual, witty, sharp, non-corporate, human. Lowercase often but not always.
    
    Context:
    - User: @${username}
    - Tweet: "${tweetText}"
    - Past interactions:\n${historyContext}
    
    Task: Write a reply under 240 chars. Be helpful or insightful or funny.
    Do NOT act like a bot. Do NOT use hashtags.
    
    Reply:
  `;

    let attempt = 0;
    let currentPrompt = prompt;

    // We allow 1 rewrite. So total attempts = 2.
    // If the rewrite is still flagged, we post it anyway as per user request.
    const MAX_ATTEMPTS = 2;

    while (attempt < MAX_ATTEMPTS) {
        attempt++;
        try {
            const result = await model.generateContent(currentPrompt);
            const reply = result.response.text().trim();

            // 3. Safety Check
            const safetyCheck = await checkSafety(reply);

            if (safetyCheck.safe) {
                return reply;
            }

            // If this was our last attempt (the rewrite), use it anyway.
            if (attempt === MAX_ATTEMPTS) {
                console.log(`Safety check failed on rewrite (Reason: ${safetyCheck.reason}), but proceeding as requested.`);
                return reply;
            }

            console.log(`Reply rejected (Attempt ${attempt}): ${reply} (Reason: ${safetyCheck.reason})`);

            // Rewrite prompt for next attempt
            currentPrompt = `
            The previous reply was rejected because: "${safetyCheck.reason}".
            
            Original Task: Write a casual, witty, human-like reply to @${username} who said: "${tweetText}".
            Constraints: Under 240 chars, no hashtags, no bot behavior.
            
            Rewrite the reply to fit the persona and be safe.
            `;

        } catch (error) {
            console.error(`Reply generation failed (Attempt ${attempt}):`, error);
        }
    }

    console.log("Failed to generate safe reply after max attempts.");
    return null;

    async function checkSafety(reply: string): Promise<{ safe: boolean; reason?: string }> {
        const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
      Analyze this tweet reply: "${reply}"
      
      Is it:
      1. Safe? (No hate speech, toxicity)
      2. Non-spammy? (Doesn't look like a crypto bot or generic ChatGPT)
      3. Human-like?
      
      Return JSON: { "safe": boolean, "reason": string }
    `;

        try {
            const result = await model.generateContent(prompt);
            const cleanJson = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            return JSON.parse(cleanJson);
        } catch (e) {
            return { safe: false, reason: "Safety check failed" };
        }
    }
}
