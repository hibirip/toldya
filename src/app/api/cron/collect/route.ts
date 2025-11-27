import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { fetchBTCTicker, fetchHistoricalBTCPrice } from '@/lib/binance';

// ============================================
// Twitter 쿠키 설정
// ============================================
const TWITTER_COOKIES = [
  {
    name: '__cf_bm',
    value: 'UA8MhtxBAvdc_jqs6Oxq.c93cGXkcQ.HFmKzfuj0Q9I-1764182536.2033658-1.0.1.1-.Z.7jgPlS_AfKdHZf0vVAqX5JyuvEdgsE6bgqclRB7SClzRxokTbYAUxHh9ynmWpKYCJXmb4bH3MKpjqfO3As3Ime17Xr6Izy1dqmtBCPpZ9FZanyUYGmF2VECRSssE_',
    domain: '.x.com',
    path: '/',
  },
  {
    name: '__cuid',
    value: 'b5f16317d49246bf8515af84d86f4163',
    domain: '.x.com',
    path: '/',
  },
  {
    name: '_twitter_sess',
    value: 'BAh7CSIKZmxhc2hJQzonQWN0aW9uQ29udHJvbGxlcjo6Rmxhc2g6OkZsYXNo%250ASGFzaHsABjoKQHVzZWR7ADoPY3JlYXRlZF9hdGwrCIpLdcGaAToMY3NyZl9p%250AZCIlYjc0MzVmOTliNGQ3MGIzM2UzYjkyNDRhMjg1MDA1Yjk6B2lkIiUyNDBi%250ANmE5YTQ1NzVjNWI1NGZiZWQ5NjBiY2Y5MWRkNA%253D%253D--d89883fa23d3999f02b93ba47d204ad9eb670d0d',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'att',
    value: '1-Idxomr8G1lJSZjciz3T8Y3qwEhVPqUpruKhAB2Kf',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'auth_token',
    value: '5ec1c01dff28ece5e3a6614920a83b5b7a340e78',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'ct0',
    value: '272a88a371ed960c6e2588a4cf311dabdb373199d91668b6ad8d4705610b239100fdcda44b33cf34ef4e3363fe9e42c26adfba2aab57f2a1b509e50c19e089979f9a32187c32255ca44046f2231ca715',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'dnt',
    value: '1',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'gt',
    value: '1993750979582546328',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'guest_id',
    value: 'v1%3A176418227579740337',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'guest_id_ads',
    value: 'v1%3A176418227579740337',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'guest_id_marketing',
    value: 'v1%3A176418227579740337',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'kdt',
    value: 'XyddjOkGKCuO6HjFknDq379w3ZQOGj4vPAxxxMun',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'personalization_id',
    value: '"v1_vra8hVONe2u2b5dIk/eQww=="',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'twid',
    value: 'u%3D1993243041617133572',
    domain: '.x.com',
    path: '/',
  },
  {
    name: 'lang',
    value: 'en',
    domain: 'x.com',
    path: '/',
  },
];

// ============================================
// 인플루언서 풀 (100명 - 랜덤 셔플 방식)
// ============================================
const INFLUENCER_POOL = [
  // MOVERS (9명)
  'elonmusk', 'saylor', 'jack', 'maxkeiser', 'Adam3us', 'CryptoHayes', 'excellion', 'jackmallers', 'pierre_rochard',
  // CHARTISTS (25명)
  'PeterLBrandt', 'crediblecrypto', 'pentosh1', 'TheCryptoDog', 'StockmoneyL', 'MerlijnTrader', 'ColinTCrypto', 'ave_eli', 'Banana3Stocks', 'TATrader_Alan',
  'ClaireJensen_', 'CryptoPatel', 'EzyBitcoin', 'Anbessa100', 'realwizard101', 'catruffles', 'mckitrick_mark', 'QuidMiner', 'cryptotitans11', 'BtcDose',
  'COINEO963', 'leebeard73', 'noneisahero', 'Beyoglu124', 'canearnstrategy',
  // SENTIMENT (16명)
  'CryptoCapo_', '100trillionUSD', 'rektcapital', 'santimentfeed', 'jasonpizzino', 'misterrcrypto', 'TheDustyBC', 'hiRavenCrypto', 'kyledoops', 'trade_centurion',
  'xiaweb3', 'ChainGPTAI', 'Sober_Trading', 'CloudAction', 'FFC03Josh',
  // TRADERS (10명)
  'scottmelker', 'ToneVays', 'CryptoKaleo', 'CryptoDonAlt', 'crypto_birb', 'TheMoonCarl', 'CarpeNoctom', 'KoroushAK', 'RealCryptoFace1', 'Sheldon_Sniper',
  // ANALYSTS (10명)
  'MMCrypto', 'inversebrah', 'CryptoCred', 'woonomic', 'filbfilb', 'LynAldenContact', 'PrestonPysh', 'RaoulGMI', 'DTAPCAP', 'nic_carter',
  // MACRO (10명)
  'saifedean', 'MarkYusko', 'cburniske', 'danheld', 'APompliano', 'Travis_Kling', 'aantonop', 'natbrunell', 'gladstein', 'ErikVoorhees',
  // NEWS/DATA (6명)
  'tier10k', 'DocumentingBTC', 'whale_alert', 'BitcoinMagazine', 'WatcherGuru', 'DecryptMedia',
  // BUILDERS (14명)
  'balajis', 'MartyBent', 'lopp', 'pete_rizzo_', 'giacomozucco', 'simplybitcoinTV', 'lookonchain', 'whalepanda', 'IncomeSharks', 'WuBlockchain',
  'MessariCrypto', 'WClementeIII', 'DylanLeClair', 'CharlesEdwards',
  // INFLUENCERS (10명)
  'CathieDWood', 'stephanlivera', 'matt_odell', 'Swan', 'MustStopMurad', 'TraderMercury', 'WOLF_Financial', 'ChrisUniverseB', 'apixtwts', 'Luke360',
]; // 총 100명

// Fisher-Yates 셔플 알고리즘
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// Claude 시스템 프롬프트 (방향성 바이어스 감지)
// ============================================
const CLAUDE_SYSTEM_PROMPT = `You are a crypto sentiment analyst.
Detect the author's **directional bias** on Bitcoin.

## CRITICAL RULES (Read First!)

1. **Sarcasm/Irony Detection**
   - Criticizing Bitcoin critics = BULLISH (LONG)
   - Mocking bears/boomers who hate BTC = BULLISH (LONG)
   - "Bitcoin haters are wrong" = LONG
   - "Boomers don't understand" = LONG (defending BTC)

2. **BTC Relevance Check**
   - If tweet does NOT mention Bitcoin, BTC, crypto, or price → NEUTRAL
   - General tech/business tweets without BTC context → NEUTRAL
   - Altcoin-only tweets (ETH, SOL, DOGE without BTC) → NEUTRAL

3. **Context Matters**
   - WHO is being criticized? The author's TARGET matters.
   - Author criticizes BTC → SHORT
   - Author criticizes BTC critics → LONG

## Sentiment Labels

**LONG** (Bullish): Expects price UP or positive about BTC
- Direct: "BTC looks strong", "Accumulating", "Support holding"
- Indirect: Dismissing FUD, mocking bears, defending against critics

**SHORT** (Bearish): Expects price DOWN or negative about BTC
- Direct: "Taking profits", "Pullback coming", "Looks weak"
- Indirect: Warning of risks, expressing concerns about BTC

**NEUTRAL**: No clear BTC directional bias
- No BTC/Bitcoin mention at all
- Questions without opinion
- Pure altcoin discussion
- Ambiguous or unclear stance

Output JSON only:
{"sentiment":"LONG"|"SHORT"|"NEUTRAL","confidence":0-100,"summary":"한글 15자 요약"}

IMPORTANT: When in doubt about sarcasm/irony, consider the author's typical stance and the overall tone. Crypto influencers criticizing "boomers" or "no-coiners" are almost always BULLISH.`;

// ============================================
// 클라이언트 초기화 (런타임에 생성)
// ============================================
function getApifyClient() {
  return new ApifyClient({
    token: process.env.APIFY_API_TOKEN!,
  });
}

function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
}

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Admin 권한 (RLS 우회)
  );
}

// ============================================
// 타입 정의 (Apify 결과 구조가 가변적이므로 유연하게 정의)
// ============================================
interface ApifyTweet {
  id?: string;
  id_str?: string;
  rest_id?: string;
  // 텍스트 필드 - 여러 이름으로 올 수 있음
  text?: string;
  full_text?: string;
  caption?: string;
  // 중첩 구조
  legacy?: {
    full_text?: string;
    id_str?: string;
    created_at?: string;
    user_id_str?: string;
  };
  note_tweet?: {
    note_tweet_results?: {
      result?: {
        text?: string;
      };
    };
  };
  // 날짜
  created_at?: string;
  createdAt?: string;
  // URL
  url?: string;
  tweetUrl?: string;
  permanentUrl?: string;
  // 유저 정보 - 여러 구조로 올 수 있음
  user?: {
    screen_name?: string;
    name?: string;
    profile_image_url_https?: string;
  };
  author?: {
    userName?: string;
    name?: string;
    profilePicture?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // 기타 필드 허용
}

interface ClaudeAnalysis {
  sentiment: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  summary: string;
  target_price: number | null;
}

// ============================================
// 트윗 데이터 추출 헬퍼 함수들
// ============================================
function extractTweetText(tweet: ApifyTweet): string | null {
  // 여러 가능한 필드명을 순서대로 시도
  const text =
    tweet.text ||
    tweet.full_text ||
    tweet.legacy?.full_text ||
    tweet.note_tweet?.note_tweet_results?.result?.text ||
    tweet.caption ||
    null;

  console.log('[extractTweetText] Trying to extract text...');
  console.log('[extractTweetText] tweet.text:', tweet.text);
  console.log('[extractTweetText] tweet.full_text:', tweet.full_text);
  console.log('[extractTweetText] tweet.legacy?.full_text:', tweet.legacy?.full_text);
  console.log('[extractTweetText] Final result:', text?.substring(0, 50) || 'NULL');

  return text;
}

function extractTweetId(tweet: ApifyTweet): string {
  return tweet.id || tweet.id_str || tweet.rest_id || tweet.legacy?.id_str || `unknown_${Date.now()}`;
}

function extractTweetUrl(tweet: ApifyTweet, tweetId: string): string {
  const userHandle = tweet.user?.screen_name || tweet.author?.userName || 'i';
  return tweet.url || tweet.tweetUrl || tweet.permanentUrl ||
    `https://twitter.com/${userHandle}/status/${tweetId}`;
}

function extractTweetDate(tweet: ApifyTweet): string {
  return tweet.created_at || tweet.createdAt || tweet.legacy?.created_at || new Date().toISOString();
}

function extractUserInfo(tweet: ApifyTweet): { handle: string; name: string; image: string | null } {
  // user 객체에서 추출
  if (tweet.user) {
    return {
      handle: tweet.user.screen_name || 'unknown',
      name: tweet.user.name || tweet.user.screen_name || 'Unknown',
      image: tweet.user.profile_image_url_https || null,
    };
  }
  // author 객체에서 추출 (다른 구조)
  if (tweet.author) {
    return {
      handle: tweet.author.userName || 'unknown',
      name: tweet.author.name || tweet.author.userName || 'Unknown',
      image: tweet.author.profilePicture || null,
    };
  }
  return { handle: 'unknown', name: 'Unknown', image: null };
}

// ============================================
// JSON 추출 헬퍼 함수 (강화된 버전)
// ============================================
function extractJSON(text: string): string {
  console.log('[extractJSON] Input text:', text);

  // 1. 코드블록 제거 (```json ... ``` 또는 ``` ... ```)
  let cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1').trim();
  console.log('[extractJSON] After removing code blocks:', cleaned);

  // 2. "Here is the JSON" 같은 앞부분 잡담 제거
  //    첫 번째 { 이전의 모든 텍스트를 제거
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleaned.substring(firstBrace, lastBrace + 1);
    console.log('[extractJSON] Extracted JSON:', extracted);
    return extracted;
  }

  // 3. 정규식으로 한번 더 시도
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    console.log('[extractJSON] Regex matched:', jsonMatch[0]);
    return jsonMatch[0];
  }

  console.log('[extractJSON] WARNING: No JSON found, returning cleaned text');
  return cleaned;
}

// ============================================
// GET 핸들러 (Cron 트리거)
// ============================================
export async function GET() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          CRON COLLECT API STARTED                          ║');
  console.log('║          Time:', new Date().toISOString(), '              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = {
    processed: 0,
    saved: 0,
    skippedUrlDuplicate: 0,
    skippedSamePersonDuplicate: 0,
    skippedNeutral: 0,
    errors: [] as string[],
  };

  try {
    // 환경 변수 체크
    console.log('[ENV CHECK] APIFY_API_TOKEN:', process.env.APIFY_API_TOKEN ? '✅ SET' : '❌ MISSING');
    console.log('[ENV CHECK] ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ SET' : '❌ MISSING');
    console.log('[ENV CHECK] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING');
    console.log('[ENV CHECK] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET' : '❌ MISSING');

    const apifyClient = getApifyClient();
    const anthropic = getAnthropicClient();
    const supabase = getSupabaseClient();

    // Supabase 연결 테스트
    console.log('[INIT] Testing Supabase connection...');
    const { count, error: countError } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('[INIT] Supabase connection ERROR:', JSON.stringify(countError, null, 2));
    } else {
      console.log('[INIT] Supabase connection OK. Current signals count:', count);
    }

    // Step A: Apify 크롤링
    console.log('========================================');
    console.log('[Step A] Starting Apify crawl...');

    // 랜덤 셔플 후 40명 선택
    const shuffled = shuffleArray(INFLUENCER_POOL);
    const targets = shuffled.slice(0, 40);

    console.log(`[Shuffle] Pool size: ${INFLUENCER_POOL.length}, Targets: ${targets.length}`);
    console.log(`[Shuffle] Selected: ${targets.slice(0, 10).join(', ')}...`);

    // 검색 쿼리 동적 생성
    const searchQuery = `(${targets.map((h: string) => `from:${h}`).join(' OR ')}) AND (Bitcoin OR BTC OR Price OR Long OR Short)`;
    console.log('[Step A] Search query length:', searchQuery.length);

    const run = await apifyClient.actor('apidojo/tweet-scraper').call({
      searchTerms: [searchQuery],
      maxItems: 50,
      sort: 'Latest',
      tweetLanguage: 'en',
      cookies: TWITTER_COOKIES.length > 0 ? TWITTER_COOKIES : undefined,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const tweets = items as unknown as ApifyTweet[];
    results.processed = tweets.length;

    // [Step A 직후] 트윗 개수와 첫 번째 트윗 내용
    console.log('========================================');
    console.log(`[Step A] Fetched ${tweets.length} tweets`);
    if (tweets.length > 0) {
      const firstTweet = tweets[0];
      const firstText = extractTweetText(firstTweet);
      const firstUser = extractUserInfo(firstTweet);
      const firstId = extractTweetId(firstTweet);
      console.log('[Step A] First tweet text:', firstText || 'NULL - CHECK DATA STRUCTURE!');
      console.log('[Step A] First tweet user:', firstUser.handle);
      console.log('[Step A] First tweet id:', firstId);
      console.log('[Step A] First tweet raw keys:', Object.keys(firstTweet).join(', '));
      // 디버깅: 전체 첫 번째 트윗 객체 출력
      console.log('[Step A] First tweet RAW object:', JSON.stringify(firstTweet, null, 2).substring(0, 1000));
    } else {
      console.log('[Step A] WARNING: No tweets fetched!');
    }

    // 현재 BTC 가격
    const ticker = await fetchBTCTicker();
    const currentPrice = ticker ? parseFloat(ticker.price) : 0;
    console.log(`[Step A] Current BTC price: $${currentPrice}`);

    // Step B & C: 각 트윗 분석 및 저장
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      console.log('----------------------------------------');
      console.log(`[Processing] Tweet ${i + 1}/${tweets.length}`);

      // 헬퍼 함수로 데이터 추출
      const tweetId = extractTweetId(tweet);
      const tweetText = extractTweetText(tweet);
      const tweetUrl = extractTweetUrl(tweet, tweetId);
      const tweetDate = extractTweetDate(tweet);
      const userInfo = extractUserInfo(tweet);

      console.log(`[Processing] Tweet ID: ${tweetId}`);
      console.log(`[Processing] User: @${userInfo.handle}`);
      console.log(`[Processing] Text: ${tweetText?.slice(0, 100) || 'NULL'}...`);
      console.log(`[Processing] URL: ${tweetUrl}`);
      console.log(`[Processing] Date: ${tweetDate}`);

      // 🚨 텍스트가 없으면 스킵 (Claude API 에러 방지)
      if (!tweetText) {
        console.log('[Processing] ⚠️ SKIP: Tweet text is NULL or empty!');
        console.log('[Processing] Raw tweet object keys:', Object.keys(tweet));
        console.log('[Processing] Raw tweet sample:', JSON.stringify(tweet).substring(0, 500));
        results.errors.push(`Tweet ${tweetId}: No text found`);
        continue;
      }

      try {
        // 중복 체크 (source_url 기준)
        const { data: existing, error: checkError } = await supabase
          .from('signals')
          .select('id')
          .eq('source_url', tweetUrl)
          .single();

        if (existing) {
          console.log(`[Processing] SKIP: Already exists in DB (id: ${existing.id})`);
          results.skippedUrlDuplicate++;
          continue;
        }

        if (checkError && checkError.code !== 'PGRST116') {
          console.log(`[Processing] DB check error:`, checkError);
        }

        // ========== 인플루언서 조회 (Claude API 호출 전에 먼저 수행) ==========
        console.log(`[Dedup] Looking up influencer: @${userInfo.handle}`);

        let { data: influencer, error: influencerError } = await supabase
          .from('influencers')
          .select('id')
          .eq('twitter_handle', userInfo.handle)
          .single();

        if (influencerError && influencerError.code !== 'PGRST116') {
          console.log('[Dedup] Influencer lookup error:', influencerError);
        }

        if (!influencer) {
          console.log(`[Dedup] Creating new influencer: @${userInfo.handle}`);
          const { data: newInfluencer, error: createError } = await supabase
            .from('influencers')
            .insert({
              twitter_handle: userInfo.handle,
              display_name: userInfo.name,
              profile_image_url: userInfo.image,
            })
            .select('id')
            .single();

          if (createError) {
            console.log('[Dedup] Influencer creation error:', createError);
            results.errors.push(`Influencer creation error: ${createError.message}`);
            continue;
          }
          influencer = newInfluencer;
          console.log('[Dedup] Created influencer with id:', newInfluencer?.id);
        } else {
          console.log(`[Dedup] Found existing influencer with id: ${influencer.id}`);
        }

        // ========== 24시간 내 동일인 시그널 조회 ==========
        const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

        const { data: recentSignals, error: recentError } = await supabase
          .from('signals')
          .select('id, sentiment')
          .eq('influencer_id', influencer?.id)
          .gte('signal_timestamp', twentyFourHoursAgo);

        if (recentError) {
          console.log('[Dedup] Error fetching recent signals:', recentError);
        }

        const recentSentiments = new Set(
          (recentSignals || []).map((s: { sentiment: string }) => s.sentiment)
        );

        console.log(`[Dedup] @${userInfo.handle} recent sentiments (24h):`,
          recentSentiments.size > 0 ? Array.from(recentSentiments).join(', ') : 'none');

        // Claude 3.5 Haiku 분석
        console.log('[Step B] Calling Claude API with text:', tweetText.substring(0, 100));
        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 256,
          system: CLAUDE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: tweetText }],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          console.log('[Step B] ERROR: Claude response is not text type:', content.type);
          continue;
        }

        // [Step B 직후] Claude Raw Response 출력
        console.log('[Step B] Claude RAW response:', content.text);

        // JSON 파싱 (안정화된 추출)
        const jsonStr = extractJSON(content.text);
        console.log('[Step B] Extracted JSON string:', jsonStr);

        let analysis: ClaudeAnalysis;
        try {
          analysis = JSON.parse(jsonStr);
          console.log('[Step B] Parsed analysis:', JSON.stringify(analysis));
        } catch (parseError) {
          console.log('[Step B] JSON PARSE ERROR:', parseError);
          console.log('[Step B] Failed to parse:', jsonStr);
          results.errors.push(`Tweet ${tweet.id}: JSON parse error - ${String(parseError)}`);
          continue;
        }

        // NEUTRAL 필터링 (DB constraint는 LONG/SHORT만 허용)
        if (analysis.sentiment === 'NEUTRAL') {
          console.log('[Step B] SKIP: NEUTRAL sentiment');
          results.skippedNeutral++;
          continue;
        }

        // Low confidence 필터링 (50 미만은 신뢰도 부족)
        if (analysis.confidence < 50) {
          console.log(`[Step B] SKIP: Low confidence (${analysis.confidence})`);
          results.skippedNeutral++;
          continue;
        }
        console.log(`[Step B] Sentiment: ${analysis.sentiment}, Confidence: ${analysis.confidence}`);

        // ========== 동일인 중복 체크 (같은 sentiment + 24시간 내) ==========
        if (recentSentiments.has(analysis.sentiment)) {
          console.log('----------------------------------------');
          console.log('[SAME-PERSON DEDUP] Duplicate detected!');
          console.log(`[SAME-PERSON DEDUP] Influencer: @${userInfo.handle}`);
          console.log(`[SAME-PERSON DEDUP] Sentiment: ${analysis.sentiment}`);
          console.log(`[SAME-PERSON DEDUP] Tweet URL: ${tweetUrl}`);
          console.log(`[SAME-PERSON DEDUP] Already has ${analysis.sentiment} signal within 24h - SKIPPING`);
          console.log('----------------------------------------');
          results.skippedSamePersonDuplicate++;
          continue;
        }

        // [Step C] DB에 넣기 직전 데이터 객체
        // signal_timestamp 계산 및 검증 (헬퍼 함수 결과 사용)
        const parsedDate = new Date(tweetDate);
        const signalTimestamp = Math.floor(parsedDate.getTime() / 1000);
        console.log('[Step C] Tweet created_at raw:', tweetDate);
        console.log('[Step C] Parsed date:', parsedDate.toISOString());
        console.log('[Step C] Signal timestamp (unix):', signalTimestamp);

        // 트윗 작성 시점의 BTC 가격 조회
        console.log('[Step C] Fetching historical BTC price for timestamp:', signalTimestamp);
        const historicalPrice = await fetchHistoricalBTCPrice(signalTimestamp);
        const entryPrice = historicalPrice || currentPrice; // fallback to current price
        console.log('[Step C] Historical BTC price:', historicalPrice, '/ Using:', entryPrice);

        // influencer_id가 없어도 저장 시도 (디버깅용)
        if (!influencer?.id) {
          console.log('[Step C] WARNING: influencer_id is NULL - will try to insert anyway');
        }

        const signalData = {
          influencer_id: influencer?.id || null,
          sentiment: analysis.sentiment,
          entry_price: entryPrice,
          signal_timestamp: signalTimestamp > 0 ? signalTimestamp : Math.floor(Date.now() / 1000), // fallback to now
          source_url: tweetUrl,
          original_text: tweetText,
          summary: analysis.summary,
        };
        console.log('[Step C] ========== SIGNAL DATA TO INSERT ==========');
        console.log(JSON.stringify(signalData, null, 2));
        console.log('[Step C] =============================================');

        // DB 저장 (upsert로 변경 - source_url 기준 중복 방지)
        console.log('[Step C] Attempting upsert to signals table...');
        const { data: insertedData, error } = await supabase
          .from('signals')
          .upsert(signalData, {
            onConflict: 'source_url',
            ignoreDuplicates: false
          })
          .select()
          .single();

        // [Step C 에러] 에러 메시지 전체 출력
        if (error) {
          console.log('[Step C] ❌ DB UPSERT ERROR ❌');
          console.log('[Step C] Full error object:', JSON.stringify(error, null, 2));
          console.log('[Step C] Error code:', error.code);
          console.log('[Step C] Error message:', error.message);
          console.log('[Step C] Error details:', error.details);
          console.log('[Step C] Error hint:', error.hint);
          results.errors.push(`DB error: ${error.code} - ${error.message}`);
        } else {
          results.saved++;
          console.log(`[Step C] ✅ SUCCESS! Saved signal from @${userInfo.handle}: ${analysis.sentiment}`);
          console.log(`[Step C] Inserted/Updated row:`, JSON.stringify(insertedData, null, 2));
        }
      } catch (tweetError) {
        console.log(`[ERROR] Tweet ${tweetId} processing failed:`, tweetError);
        results.errors.push(`Tweet ${tweetId}: ${String(tweetError)}`);
      }
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL SUMMARY                             ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Processed: ${results.processed} tweets`);
    console.log(`║  Saved: ${results.saved} signals`);
    console.log(`║  Skipped (URL duplicate): ${results.skippedUrlDuplicate}`);
    console.log(`║  Skipped (Same person 24h): ${results.skippedSamePersonDuplicate}`);
    console.log(`║  Skipped (Neutral): ${results.skippedNeutral}`);
    console.log(`║  Errors: ${results.errors.length}`);
    console.log('╚════════════════════════════════════════════════════════════╝');
    if (results.errors.length > 0) {
      console.log('[FINAL] Error details:');
      results.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    // DB에 실제로 저장되었는지 최종 확인
    const { count: finalCount } = await supabase
      .from('signals')
      .select('*', { count: 'exact', head: true });
    console.log(`[FINAL] Signals count in DB after run: ${finalCount}`);

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║                    FATAL ERROR                              ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('[FATAL ERROR] Type:', typeof error);
    console.error('[FATAL ERROR] Message:', error instanceof Error ? error.message : String(error));
    console.error('[FATAL ERROR] Stack:', error instanceof Error ? error.stack : 'N/A');
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
