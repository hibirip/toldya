import { NextRequest, NextResponse } from 'next/server';
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
// 인플루언서 그룹 (50인 전원)
// ============================================

// MOVERS (10명) - 시장을 움직이는 거물급
const GROUP_MOVERS = [
  'elonmusk', 'saylor', 'jack', 'maxkeiser', 'Adam3us',
  'CryptoHayes', 'cz_binance', 'excellion', 'jackmallers', 'pierre_rochard',
];

// CHARTISTS (25명) - 차트/기술적 분석가
const GROUP_CHARTISTS = [
  'PeterLBrandt', 'crediblecrypto', 'pentosh1', 'TheCryptoDog', 'StockmoneyL',
  'MerlijnTrader', 'ColinTCrypto', 'ave_eli', 'Banana3Stocks', 'TATrader_Alan',
  'ClaireJensen_', 'CryptoPatel', 'EzyBitcoin', 'Anbessa100', 'realwizard101',
  'catruffles', 'mckitrick_mark', 'QuidMiner', 'cryptotitans11', 'BtcDose',
  'COINEO963', 'leebeard73', 'noneisahero', 'Beyoglu124', 'canearnstrategy',
];

// SENTIMENT (15명) - 센티먼트/온체인 분석가
const GROUP_SENTIMENT = [
  'CryptoCapo_', '100trillionUSD', 'rektcapital', 'santimentfeed', 'jasonpizzino',
  'misterrcrypto', 'TheDustyBC', 'hiRavenCrypto', 'kyledoops', 'trade_centurion',
  'xiaweb3', 'ChainGPTAI', 'Sober_Trading', 'CloudAction', 'FFC03Josh',
];

// 전체 50명 합체
const ALL_INFLUENCERS = [...GROUP_MOVERS, ...GROUP_CHARTISTS, ...GROUP_SENTIMENT];

// ============================================
// Claude 시스템 프롬프트 (BTC Only - 알트코인 필터링 강화)
// ============================================
const CLAUDE_SYSTEM_PROMPT = `너는 가상화폐 트레이딩 전문가다. 트윗 내용을 분석하여 비트코인(BTC)에 대한 포지션을 JSON으로 출력해.

⚠️ 중요 규칙:
- 분석 대상은 오직 **비트코인(BTC)**이다.
- 트윗이 이더리움(ETH), 솔라나(SOL), 도지(DOGE), XRP 등 **알트코인**에 대한 내용이거나,
  비트코인에 대한 직접적인 언급/함의가 없다면 무조건 **"NEUTRAL"**로 처리해.
- "크립토 전체" 또는 "시장 전반"에 대한 언급도 BTC 특정이 아니면 NEUTRAL.

{
  "sentiment": "LONG" | "SHORT" | "NEUTRAL",
  "confidence": 0~100,
  "summary": "15자 내외 한글 요약",
  "target_price": 숫자 또는 null
}

확실하지 않거나 단순 뉴스면 'NEUTRAL'로 처리해.`;

// ============================================
// 클라이언트 초기화
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
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// 타입 정의
// ============================================
interface ApifyTweet {
  id?: string;
  id_str?: string;
  rest_id?: string;
  text?: string;
  full_text?: string;
  caption?: string;
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
  created_at?: string;
  createdAt?: string;
  url?: string;
  tweetUrl?: string;
  permanentUrl?: string;
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
  [key: string]: any;
}

interface ClaudeAnalysis {
  sentiment: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  summary: string;
  target_price: number | null;
}

// ============================================
// 헬퍼 함수들 (핵폭탄급 강화)
// ============================================

// 만능 트윗 정보 추출 함수 - 모든 가능한 경로를 탐색
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTweetInfo(item: any): {
  text: string;
  date: string;
  id: string;
  handle: string;
  name: string;
  image: string | null;
  url: string;
} {
  // 1. 텍스트 찾기 (모든 가능한 경로 탐색)
  const text =
    item.full_text ||
    item.text ||
    item.legacy?.full_text ||
    item.legacy?.text ||
    item.content?.itemContent?.tweet_results?.result?.legacy?.full_text ||
    item.tweet?.legacy?.full_text ||
    item.note_tweet?.note_tweet_results?.result?.text ||
    item.caption ||
    item.rawContent ||
    item.renderedContent ||
    '';

  // 2. 날짜 찾기
  const date =
    item.created_at ||
    item.createdAt ||
    item.legacy?.created_at ||
    item.tweet?.legacy?.created_at ||
    item.content?.itemContent?.tweet_results?.result?.legacy?.created_at ||
    new Date().toISOString();

  // 3. ID 찾기
  const id =
    item.id_str ||
    item.id ||
    item.rest_id ||
    item.legacy?.id_str ||
    item.tweet?.rest_id ||
    item.content?.itemContent?.tweet_results?.result?.rest_id ||
    `unknown_${Date.now()}`;

  // 4. 유저 정보 찾기 (다양한 구조 대응)
  let handle = 'unknown';
  let name = 'Unknown';
  let image: string | null = null;

  // 경로 1: item.user
  if (item.user?.screen_name) {
    handle = item.user.screen_name;
    name = item.user.name || handle;
    image = item.user.profile_image_url_https || null;
  }
  // 경로 2: item.author
  else if (item.author?.userName) {
    handle = item.author.userName;
    name = item.author.name || item.author.displayName || handle;
    image = item.author.profilePicture || item.author.profileImageUrl || null;
  }
  // 경로 3: item.core.user_results (GraphQL)
  else if (item.core?.user_results?.result?.legacy?.screen_name) {
    const legacy = item.core.user_results.result.legacy;
    handle = legacy.screen_name;
    name = legacy.name || handle;
    image = legacy.profile_image_url_https || null;
  }
  // 경로 4: item.tweet.core (GraphQL nested)
  else if (item.tweet?.core?.user_results?.result?.legacy?.screen_name) {
    const legacy = item.tweet.core.user_results.result.legacy;
    handle = legacy.screen_name;
    name = legacy.name || handle;
    image = legacy.profile_image_url_https || null;
  }

  // 5. URL 찾기
  const url =
    item.url ||
    item.tweetUrl ||
    item.permanentUrl ||
    `https://twitter.com/${handle}/status/${id}`;

  return { text, date, id, handle, name, image, url };
}

// 실패 시 객체 구조 디버깅 출력
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logItemStructure(item: any, index: number): void {
  console.log(`\n🔴 [DEBUG] Item #${index} - 텍스트 추출 실패!`);
  console.log(`   Top-level Keys: ${Object.keys(item).join(', ')}`);

  // 주요 중첩 객체 키도 출력
  if (item.legacy) {
    console.log(`   item.legacy Keys: ${Object.keys(item.legacy).join(', ')}`);
  }
  if (item.user) {
    console.log(`   item.user Keys: ${Object.keys(item.user).join(', ')}`);
  }
  if (item.author) {
    console.log(`   item.author Keys: ${Object.keys(item.author).join(', ')}`);
  }
  if (item.content) {
    console.log(`   item.content Keys: ${Object.keys(item.content).join(', ')}`);
  }
  if (item.tweet) {
    console.log(`   item.tweet Keys: ${Object.keys(item.tweet).join(', ')}`);
  }
  if (item.core) {
    console.log(`   item.core Keys: ${Object.keys(item.core).join(', ')}`);
  }

  // 첫 100자 샘플 (문자열인 값들)
  const stringValues = Object.entries(item)
    .filter(([, v]) => typeof v === 'string' && (v as string).length > 10)
    .slice(0, 3);
  if (stringValues.length > 0) {
    console.log(`   Sample strings:`);
    stringValues.forEach(([k, v]) => {
      console.log(`     ${k}: "${(v as string).substring(0, 80)}..."`);
    });
  }
}

// 기존 호환성을 위한 래퍼 함수들
function extractTweetText(tweet: ApifyTweet): string | null {
  const info = extractTweetInfo(tweet);
  return info.text || null;
}

function extractTweetId(tweet: ApifyTweet): string {
  return extractTweetInfo(tweet).id;
}

function extractTweetUrl(tweet: ApifyTweet, tweetId: string): string {
  const info = extractTweetInfo(tweet);
  return info.url || `https://twitter.com/${info.handle}/status/${tweetId}`;
}

function extractTweetDate(tweet: ApifyTweet): string {
  return extractTweetInfo(tweet).date;
}

function extractUserInfo(tweet: ApifyTweet): { handle: string; name: string; image: string | null } {
  const info = extractTweetInfo(tweet);
  return { handle: info.handle, name: info.name, image: info.image };
}

function extractJSON(text: string): string {
  let cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)\n?```/g, '$1').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return cleaned;
}

// ============================================
// GET 핸들러 (Seed History API) - 개별 쿼리 방식
// ============================================
export async function GET(request: NextRequest) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      SEED HISTORY API (Individual Query Mode)              ║');
  console.log('║      Time:', new Date().toISOString(), '                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // 쿼리 파라미터 파싱
  const searchParams = request.nextUrl.searchParams;
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  // limit은 '한 사람당' 최대 개수로 변경 (기본 3개)
  const limitPerPerson = parseInt(searchParams.get('limit') || '3', 10);
  // group 파라미터: 'all' | 'movers' | 'sentiment' | 'chartists' (기본: movers+sentiment)
  const group = searchParams.get('group') || 'core';

  // 필수 파라미터 검증
  if (!since || !until) {
    return NextResponse.json(
      { success: false, error: 'Missing required parameters: since, until (format: YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  // 타겟 인플루언서 선택
  let targetInfluencers: string[];
  switch (group) {
    case 'all':
      targetInfluencers = ALL_INFLUENCERS;
      break;
    case 'movers':
      targetInfluencers = GROUP_MOVERS;
      break;
    case 'sentiment':
      targetInfluencers = GROUP_SENTIMENT;
      break;
    case 'chartists':
      targetInfluencers = GROUP_CHARTISTS;
      break;
    case 'core':
    default:
      // 과거 데이터는 MOVERS + SENTIMENT 위주 (25명)
      targetInfluencers = [...GROUP_MOVERS, ...GROUP_SENTIMENT];
      break;
  }

  console.log(`[Params] since: ${since}, until: ${until}, limitPerPerson: ${limitPerPerson}, group: ${group}`);
  console.log(`[Target] ${targetInfluencers.length} influencers: ${targetInfluencers.slice(0, 5).join(', ')}...`);

  const results = {
    processed: 0,
    saved: 0,
    skippedUrlDuplicate: 0,
    skippedSamePersonDuplicate: 0,
    skippedNeutral: 0,
    errors: [] as string[],
  };

  // 🦜 앵무새 방지: 유저별 마지막 sentiment 추적
  // sort: "Top"이므로 인기 트윗이 먼저 처리됨 → 덜 인기있는 중복 의견 버림
  const userLastSentiment: Record<string, string> = {};

  try {
    const apifyClient = getApifyClient();
    const anthropic = getAnthropicClient();
    const supabase = getSupabaseClient();

    // Step A: Apify 크롤링 (개별 쿼리 배열 방식)
    console.log('========================================');
    console.log('[Step A] Starting Apify crawl (Individual Queries)...');

    // 🔥 핵심 변경: 각 인플루언서별로 개별 쿼리 생성
    // 이렇게 하면 트위터가 날짜 필터를 정확히 인식함
    const searchQueries = targetInfluencers.map((handle) =>
      `(from:${handle}) (Bitcoin OR BTC) since:${since} until:${until}`
    );

    console.log(`[Step A] Generated ${searchQueries.length} individual queries`);
    console.log('[Step A] Sample query:', searchQueries[0]);

    // maxItems = 한 사람당 개수 × 인원수 (전체 총합 제한)
    const totalMaxItems = limitPerPerson * targetInfluencers.length;
    console.log(`[Step A] Total maxItems: ${totalMaxItems} (${limitPerPerson} × ${targetInfluencers.length})`);

    const run = await apifyClient.actor('apidojo/tweet-scraper').call({
      searchTerms: searchQueries,  // 배열로 전달 → 각각 개별 검색
      maxItems: totalMaxItems,     // 전체 최대 개수
      sort: 'Top',                 // 인기순 정렬
      tweetLanguage: 'en',
      cookies: TWITTER_COOKIES.length > 0 ? TWITTER_COOKIES : undefined,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    // 🔥 noResults 객체 필터링 (검색 결과 0개인 쿼리의 빈 응답 제거)
    const validItems = items.filter((item: unknown) => {
      const obj = item as Record<string, unknown>;
      return !obj.noResults && !obj.error;
    });

    const tweets = validItems as unknown as ApifyTweet[];
    results.processed = tweets.length;
    console.log(`[Step A] Raw items: ${items.length}, Valid tweets: ${tweets.length}`);

    console.log(`[Step A] Fetched ${tweets.length} TOP tweets`);
    if (tweets.length > 0) {
      const firstTweet = tweets[0];
      const firstText = extractTweetText(firstTweet);
      const firstUser = extractUserInfo(firstTweet);
      console.log('[Step A] First tweet:', firstText?.substring(0, 100) || 'NULL');
      console.log('[Step A] First tweet user:', firstUser.handle);

      // 🔍 첫 번째 아이템 구조 디버깅 (항상 출력)
      console.log('\n📦 [DEBUG] First item structure:');
      console.log(`   Top-level Keys: ${Object.keys(firstTweet).join(', ')}`);
      if (!firstText) {
        logItemStructure(firstTweet, 0);
      }
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

      const tweetId = extractTweetId(tweet);
      const tweetText = extractTweetText(tweet);
      const tweetUrl = extractTweetUrl(tweet, tweetId);
      const tweetDate = extractTweetDate(tweet);
      const userInfo = extractUserInfo(tweet);

      console.log(`[Processing] User: @${userInfo.handle}`);
      console.log(`[Processing] Text: ${tweetText?.slice(0, 100) || 'NULL'}...`);

      if (!tweetText) {
        console.log('[Processing] SKIP: Tweet text is NULL');
        // 🔴 디버깅: 객체 구조 출력
        logItemStructure(tweet, i);
        results.errors.push(`Tweet ${tweetId}: No text found`);
        continue;
      }

      try {
        // URL 중복 체크
        const { data: existing } = await supabase
          .from('signals')
          .select('id')
          .eq('source_url', tweetUrl)
          .single();

        if (existing) {
          console.log(`[Processing] SKIP: Already exists (id: ${existing.id})`);
          results.skippedUrlDuplicate++;
          continue;
        }

        // 인플루언서 조회/생성
        let { data: influencer } = await supabase
          .from('influencers')
          .select('id')
          .eq('twitter_handle', userInfo.handle)
          .single();

        if (!influencer) {
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
            console.log('[Processing] Influencer creation error:', createError);
            results.errors.push(`Influencer creation error: ${createError.message}`);
            continue;
          }
          influencer = newInfluencer;
        }

        // 24시간 내 동일인 시그널 조회 (과거 데이터이므로 트윗 시점 기준)
        const parsedDate = new Date(tweetDate);
        const signalTimestamp = Math.floor(parsedDate.getTime() / 1000);
        const twentyFourHoursAgo = signalTimestamp - (24 * 60 * 60);

        const { data: recentSignals } = await supabase
          .from('signals')
          .select('id, sentiment')
          .eq('influencer_id', influencer?.id)
          .gte('signal_timestamp', twentyFourHoursAgo)
          .lte('signal_timestamp', signalTimestamp);

        const recentSentiments = new Set(
          (recentSignals || []).map((s: { sentiment: string }) => s.sentiment)
        );

        // Claude 분석
        console.log('[Step B] Calling Claude API...');
        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 256,
          system: CLAUDE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: tweetText }],
        });

        const content = response.content[0];
        if (content.type !== 'text') continue;

        const jsonStr = extractJSON(content.text);
        let analysis: ClaudeAnalysis;
        try {
          analysis = JSON.parse(jsonStr);
        } catch {
          console.log('[Step B] JSON parse error');
          results.errors.push(`Tweet ${tweetId}: JSON parse error`);
          continue;
        }

        // NEUTRAL 필터링
        if (analysis.sentiment === 'NEUTRAL') {
          console.log('[Step B] SKIP: NEUTRAL sentiment');
          results.skippedNeutral++;
          continue;
        }

        // 🦜 앵무새 방지: 같은 사람이 같은 sentiment 반복 시 스킵
        if (userLastSentiment[userInfo.handle] === analysis.sentiment) {
          console.log(`[Parrot] SKIP: @${userInfo.handle} already said ${analysis.sentiment} (session duplicate)`);
          results.skippedSamePersonDuplicate++;
          continue;
        }
        // 통과했으면 기록 업데이트
        userLastSentiment[userInfo.handle] = analysis.sentiment;

        // 동일인 중복 체크
        if (recentSentiments.has(analysis.sentiment)) {
          console.log(`[Dedup] SKIP: @${userInfo.handle} already has ${analysis.sentiment} within 24h of this tweet`);
          results.skippedSamePersonDuplicate++;
          continue;
        }

        // 트윗 시점의 BTC 가격 조회
        const historicalPrice = await fetchHistoricalBTCPrice(signalTimestamp);
        const entryPrice = historicalPrice || currentPrice;

        const signalData = {
          influencer_id: influencer?.id || null,
          sentiment: analysis.sentiment,
          entry_price: entryPrice,
          signal_timestamp: signalTimestamp > 0 ? signalTimestamp : Math.floor(Date.now() / 1000),
          source_url: tweetUrl,
          original_text: tweetText,
          summary: analysis.summary,
        };

        // DB 저장
        const { error } = await supabase
          .from('signals')
          .upsert(signalData, {
            onConflict: 'source_url',
            ignoreDuplicates: false,
          });

        if (error) {
          console.log('[Step C] DB error:', error.message);
          results.errors.push(`DB error: ${error.message}`);
        } else {
          results.saved++;
          console.log(`[Step C] ✅ Saved: @${userInfo.handle} - ${analysis.sentiment}`);
        }
      } catch (tweetError) {
        console.log(`[ERROR] Tweet ${tweetId}:`, tweetError);
        results.errors.push(`Tweet ${tweetId}: ${String(tweetError)}`);
      }
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL SUMMARY                           ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Period: ${since} ~ ${until}`);
    console.log(`║  Processed: ${results.processed} tweets`);
    console.log(`║  Saved: ${results.saved} signals`);
    console.log(`║  Skipped (URL duplicate): ${results.skippedUrlDuplicate}`);
    console.log(`║  Skipped (Same person 24h): ${results.skippedSamePersonDuplicate}`);
    console.log(`║  Skipped (Neutral): ${results.skippedNeutral}`);
    console.log(`║  Errors: ${results.errors.length}`);
    console.log('╚════════════════════════════════════════════════════════════╝');

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
