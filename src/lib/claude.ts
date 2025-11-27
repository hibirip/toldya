import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface SentimentAnalysis {
  sentiment: 'LONG' | 'SHORT' | 'NEUTRAL';
  summary: string;
}

const SYSTEM_PROMPT = `You are a cryptocurrency trading sentiment analyzer.
Analyze the given tweet and determine the trading sentiment.

Rules:
1. Return LONG if the tweet suggests buying, bullish outlook, or positive price prediction for Bitcoin/crypto
2. Return SHORT if the tweet suggests selling, bearish outlook, or negative price prediction
3. Return NEUTRAL if the tweet is not related to trading direction or is ambiguous

Respond in JSON format only:
{
  "sentiment": "LONG" | "SHORT" | "NEUTRAL",
  "summary": "Brief Korean summary of the trading signal (max 100 characters)"
}`;

export async function analyzeSentiment(tweetText: string): Promise<SentimentAnalysis | null> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20250514',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Analyze this tweet for crypto trading sentiment:\n\n"${tweetText}"`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return null;
    }

    const result = JSON.parse(content.text) as SentimentAnalysis;
    return result;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return null;
  }
}
