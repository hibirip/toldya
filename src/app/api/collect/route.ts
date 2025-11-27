import { NextResponse } from 'next/server';
import { fetchUserTweets } from '@/lib/apify';
import { analyzeSentiment } from '@/lib/claude';
import { getOrCreateInfluencer, saveSignal } from '@/lib/supabase';
import { fetchBTCTicker } from '@/lib/binance';

// 수집 대상 인플루언서 목록
const TARGET_INFLUENCERS = [
  'CryptoCapo_',
  'PeterLBrandt',
  'CryptoCred',
  'EmperorBTC',
  'Pentosh1',
];

export async function POST() {
  try {
    const results = {
      processed: 0,
      saved: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // 현재 BTC 가격 가져오기
    const ticker = await fetchBTCTicker();
    const currentPrice = ticker ? parseFloat(ticker.price) : 0;

    for (const handle of TARGET_INFLUENCERS) {
      try {
        // 트윗 가져오기
        const tweets = await fetchUserTweets(handle, 5);

        for (const tweet of tweets) {
          results.processed++;

          // Claude로 감성 분석
          const analysis = await analyzeSentiment(tweet.text);

          if (!analysis) {
            results.errors.push(`Failed to analyze: ${tweet.id}`);
            continue;
          }

          // NEUTRAL은 스킵
          if (analysis.sentiment === 'NEUTRAL') {
            results.skipped++;
            continue;
          }

          // 인플루언서 조회/생성
          const influencer = await getOrCreateInfluencer(
            tweet.author.userName,
            tweet.author.name,
            tweet.author.profilePicture
          );

          if (!influencer) {
            results.errors.push(`Failed to get/create influencer: ${handle}`);
            continue;
          }

          // 시그널 저장
          const signal = await saveSignal({
            influencer_id: influencer.id,
            sentiment: analysis.sentiment,
            entry_price: currentPrice,
            signal_timestamp: Math.floor(new Date(tweet.createdAt).getTime() / 1000),
            source_url: tweet.url,
            original_text: tweet.text,
            summary: analysis.summary,
          });

          if (signal) {
            results.saved++;
          } else {
            results.skipped++; // 이미 존재하는 시그널
          }
        }
      } catch (error) {
        results.errors.push(`Error processing ${handle}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('Collect API error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET 요청으로 상태 확인
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    targets: TARGET_INFLUENCERS,
    message: 'POST to this endpoint to start collection',
  });
}
