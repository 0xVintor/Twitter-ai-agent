import { ai } from "../lib/gemini";

interface ClassificationResult {
    should_reply: boolean;
    engagement_score: number;
    tweet_type: string;
}

export async function classifyTweet(tweetText: string, username: string): Promise<ClassificationResult> {
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
    Analyze this tweet from a user for a potential reply.
    
    Tweet: "${tweetText}"
    User: @${username}
    
    Criteria:
    1. should_reply: true if the tweet is relevant to startups, AI, coding, SaaS, indie hacking, or is an interesting question/opinion. False if it's spam, politics, hate speech, or low quality.
    2. engagement_score: 0-100 score of how valuable a reply would be. >70 is high value.
    3. tweet_type: "question", "opinion", "showcase", "news", "shitpost", "other".
    
    Return JSON only:
    {
      "should_reply": boolean,
      "engagement_score": number,
      "tweet_type": string
    }
  `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        // Clean up markdown code blocks if present
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson) as ClassificationResult;
    } catch (error) {
        console.error("Classification failed:", error);
        return { should_reply: false, engagement_score: 0, tweet_type: "error" };
    }
}
