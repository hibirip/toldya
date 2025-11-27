import { Influencer, Signal, CandleData, TimeframeType } from '@/types';
import { getRelativeTimestamp, getCandleStartTime } from './timeUtils';

// ============================================
// INFLUENCERS (8명, 다양한 trust_score & follower_count)
// ============================================

export const influencers: Influencer[] = [
  {
    id: '1',
    name: 'CryptoKing',
    handle: '@cryptoking',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoKing',
    trust_score: 72,
    follower_count: 125000,
  },
  {
    id: '2',
    name: 'BitcoinMax',
    handle: '@bitcoinmax',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BitcoinMax',
    trust_score: 58,
    follower_count: 45000,
  },
  {
    id: '3',
    name: 'TraderJoe',
    handle: '@traderjoe',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TraderJoe',
    trust_score: 85,
    follower_count: 320000,
  },
  {
    id: '4',
    name: 'MoonShot',
    handle: '@moonshot',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MoonShot',
    trust_score: 35,
    follower_count: 15000,
  },
  {
    id: '5',
    name: 'WhaleAlert',
    handle: '@whalealert',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WhaleAlert',
    trust_score: 91,
    follower_count: 890000,
  },
  {
    id: '6',
    name: 'DeFiDegen',
    handle: '@defidegen',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=DeFiDegen',
    trust_score: 42,
    follower_count: 8000,
  },
  {
    id: '7',
    name: 'BTCMaster',
    handle: '@btcmaster',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=BTCMaster',
    trust_score: 78,
    follower_count: 210000,
  },
  {
    id: '8',
    name: 'CryptoNewbie',
    handle: '@cryptonewbie',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoNewbie',
    trust_score: 25,
    follower_count: 2500,
  },
];

// ============================================
// 시나리오 A: 최근 24시간 (1H 차트 테스트) - 5개
// 1시간 간격으로 분산, 가격: $96,500 ~ $97,500
// ============================================

const scenarioA: Signal[] = [
  {
    id: 'A1',
    influencer_id: '1',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 96500,
    signal_timestamp: getRelativeTimestamp(23),  // 23시간 전
    original_text: '저점 매수 구간, 롱 진입합니다',
    full_text: '저점 매수 구간, 롱 진입합니다 🚀\n\n현재 BTC가 96.5K 지지선에서 강한 반등 신호를 보이고 있습니다. 4시간 차트 기준 RSI가 과매도 구간에서 회복 중이며, 볼린저 밴드 하단 터치 후 반등하는 전형적인 패턴입니다.\n\n진입가: $96,500\n목표가: $98,500 (1차), $100,000 (2차)\n손절가: $95,000\n\n레버리지 10x 이하 권장. DYOR! 🔥',
    source_url: 'https://twitter.com/cryptoking/status/A1',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/sample_chart_1.jpg',
    media_type: 'image',
  },
  {
    id: 'A2',
    influencer_id: '2',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 97200,
    signal_timestamp: getRelativeTimestamp(18),  // 18시간 전
    original_text: '단기 과열, 숏 추천드립니다',
    full_text: '단기 과열, 숏 추천드립니다 📉\n\n97.2K에서 숏 진입했습니다. 펀딩비가 0.05%를 넘어가고 있고, 선물 미결제약정(OI)이 급격히 증가하고 있어요. 이런 상황에서는 보통 단기 조정이 오더라고요.\n\n조심해서 접근하세요!',
    source_url: 'https://twitter.com/bitcoinmax/status/A2',
    has_media: false,
  },
  {
    id: 'A3',
    influencer_id: '3',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 96800,
    signal_timestamp: getRelativeTimestamp(12),  // 12시간 전
    original_text: '조정 후 반등 시작, 매수 타이밍',
    full_text: '조정 후 반등 시작, 매수 타이밍 ✅\n\n예상대로 96.5K~97K 구간에서 지지받고 반등 중입니다. 첨부한 차트에서 보시다시피 거래량이 동반된 양봉이 나왔어요.\n\n이 구간 놓치면 다음 진입 구간은 99K 돌파 후가 될 것 같습니다. 분할 매수 추천드립니다.\n\n#Bitcoin #BTC #CryptoTrading',
    source_url: 'https://twitter.com/traderjoe/status/A3',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/sample_chart_2.jpg',
    media_type: 'image',
  },
  {
    id: 'A4',
    influencer_id: '5',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 97000,
    signal_timestamp: getRelativeTimestamp(6),   // 6시간 전
    original_text: '고래 매수 포착, 상승 예상',
    full_text: '🐋 고래 매수 포착, 상승 예상\n\n바이낸스에서 1,500 BTC ($145M) 규모의 대량 매수가 감지되었습니다. 지난 1시간 동안 거래소 순유출이 2,300 BTC를 기록했으며, 이는 강한 축적 신호입니다.\n\n온체인 데이터:\n- Exchange Netflow: -2,300 BTC\n- Whale Transaction Count: +47%\n- SOPR: 0.98 (약간의 손실 실현 구간)\n\n대형 플레이어들이 움직이고 있습니다. 주시하세요! 👀',
    source_url: 'https://twitter.com/whalealert/status/A4',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/whale_data.png',
    media_type: 'image',
  },
  {
    id: 'A5',
    influencer_id: '4',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 97500,
    signal_timestamp: getRelativeTimestamp(2),   // 2시간 전
    original_text: '저항선 도달, 조심하세요!',
    full_text: '⚠️ 저항선 도달, 조심하세요!\n\n97.5K는 이전 고점이자 강력한 저항 구간입니다. 여기서 숏 진입했어요. 물론 뚫리면 손절하겠지만, 리스크 대비 리워드가 괜찮아 보입니다.\n\n100K 가기 전에 한 번은 조정 올 거라고 봅니다! 🎯',
    source_url: 'https://twitter.com/moonshot/status/A5',
    has_media: false,
  },
];

// ============================================
// 시나리오 B: 지난 1주일 (4H 차트 테스트) - 10개
// 4시간 캔들에 맞춰 분산, 가격: $91,500 ~ $98,000
// ============================================

const scenarioB: Signal[] = [
  {
    id: 'B1',
    influencer_id: '1',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 91500,
    signal_timestamp: getRelativeTimestamp(168),  // 7일 전
    original_text: '주간 지지선 확인, 매수 시작',
    full_text: '주간 지지선 확인, 매수 시작 📊\n\n주봉 차트에서 91.5K가 중요한 지지선으로 작용하고 있습니다. 이 레벨에서 3번 연속 반등했어요.\n\n장기 홀더라면 지금이 좋은 매수 구간입니다. DCA 전략 추천드려요!',
    source_url: 'https://twitter.com/cryptoking/status/B1',
    has_media: false,
  },
  {
    id: 'B2',
    influencer_id: '2',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 93000,
    signal_timestamp: getRelativeTimestamp(150),  // 약 6.25일 전
    original_text: '과열 신호 포착',
    full_text: '과열 신호 포착 🔴\n\n김프 4% 돌파, 펀딩비 급등 중. 단기 숏으로 대응합니다.\n\n93K 숏 진입, 91K 목표.',
    source_url: 'https://twitter.com/bitcoinmax/status/B2',
    has_media: false,
  },
  {
    id: 'B3',
    influencer_id: '3',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 92500,
    signal_timestamp: getRelativeTimestamp(132),  // 5.5일 전
    original_text: '4H 차트 반등 확인',
    full_text: '4H 차트 반등 확인 ✅\n\n예상대로 92K 부근에서 반등이 나왔습니다. 4시간봉 기준 하락 추세선을 상방 돌파했고, 거래량도 평균 대비 2배 이상 터졌어요.\n\n첨부 차트 참고하세요. 다음 저항은 95K입니다.\n\n#BTC #TechnicalAnalysis',
    source_url: 'https://twitter.com/traderjoe/status/B3',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/4h_chart_analysis.png',
    media_type: 'image',
  },
  {
    id: 'B4',
    influencer_id: '5',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 93500,
    signal_timestamp: getRelativeTimestamp(108),  // 4.5일 전
    original_text: '대형 매수벽 형성 중',
    full_text: '🐋 대형 매수벽 형성 중\n\n바이낸스 오더북 분석 결과, 93K~93.5K 구간에 약 3,000 BTC 규모의 매수벽이 형성되어 있습니다.\n\n이 벽이 무너지지 않는 한, 하방 리스크는 제한적입니다.\n\n온체인 데이터도 긍정적:\n- 장기 보유자 잔고 증가\n- 채굴자 판매 압력 감소\n- 스테이블코인 거래소 유입 증가',
    source_url: 'https://twitter.com/whalealert/status/B4',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/orderbook_depth.png',
    media_type: 'image',
  },
  {
    id: 'B5',
    influencer_id: '4',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 94500,
    signal_timestamp: getRelativeTimestamp(84),   // 3.5일 전
    original_text: '100K 간다! 올인!',
    full_text: '🚀🚀🚀 100K 간다! 올인! 🚀🚀🚀\n\n더 이상 기다릴 이유가 없습니다. 94.5K에서 풀 레버리지 롱 진입했습니다!\n\n이번 달 안에 100K 찍을 겁니다. 확신합니다!\n\n포트폴리오의 80%를 BTC에 배팅했습니다. 함께 갑시다! 💪\n\n#Bitcoin #ToTheMoon #100K',
    source_url: 'https://twitter.com/moonshot/status/B5',
    has_media: false,
  },
  {
    id: 'B6',
    influencer_id: '6',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 95500,
    signal_timestamp: getRelativeTimestamp(72),   // 3일 전
    original_text: '차익 실현 구간입니다',
    full_text: '차익 실현 구간입니다 💰\n\n95K 넘었으니 일부 익절합니다. 전량 매도는 아니고, 30% 정도만요.\n\n남은 물량은 100K까지 홀딩 예정입니다. 리스크 관리가 중요해요!',
    source_url: 'https://twitter.com/defidegen/status/B6',
    has_media: false,
  },
  {
    id: 'B7',
    influencer_id: '7',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 94800,
    signal_timestamp: getRelativeTimestamp(60),   // 2.5일 전
    original_text: '조정 매수 기회',
    full_text: '조정 매수 기회 🎯\n\n예상대로 95.5K에서 저항받고 조정이 왔네요. 94.8K에서 추가 매수했습니다.\n\n이번 조정은 건강한 되돌림입니다. 상승 추세는 여전히 유효해요.\n\n목표가: 98K (1차), 100K (2차)\n손절가: 93K',
    source_url: 'https://twitter.com/btcmaster/status/B7',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/pullback_entry.jpg',
    media_type: 'image',
  },
  {
    id: 'B8',
    influencer_id: '8',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 95800,
    signal_timestamp: getRelativeTimestamp(48),   // 2일 전
    original_text: '다시 상승 시작!',
    full_text: '다시 상승 시작! 🌙\n\n저도 95.8K에서 따라 들어갔어요! 고수분들 따라가는 중입니다 ㅎㅎ\n\n이번엔 제발 100K 가즈아!! 🙏',
    source_url: 'https://twitter.com/cryptonewbie/status/B8',
    has_media: false,
  },
  {
    id: 'B9',
    influencer_id: '3',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 97000,
    signal_timestamp: getRelativeTimestamp(36),   // 1.5일 전
    original_text: '일부 익절 추천',
    full_text: '일부 익절 추천 📊\n\n97K 도달했습니다. 제가 드린 진입가 기준으로 +4.5% 수익 구간이에요.\n\n전량 청산은 아니지만, 50% 정도는 익절하시는 게 좋을 것 같습니다. 98K 저항이 꽤 강해 보입니다.\n\n나머지 물량은 100K 목표로 홀딩하시죠.\n\n수익 축하드립니다! 🎉',
    source_url: 'https://twitter.com/traderjoe/status/B9',
    has_media: false,
  },
  {
    id: 'B10',
    influencer_id: '1',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 96200,
    signal_timestamp: getRelativeTimestamp(28),   // 약 1.17일 전
    original_text: '재진입 타이밍',
    full_text: '재진입 타이밍 🔄\n\n익절 후 다시 진입합니다. 96.2K에서 롱 포지션 재개했어요.\n\n97K 지지 확인되면 추가 매수 예정입니다. 이번 주 내로 98K 돌파할 것으로 예상합니다.\n\n시장 모멘텀이 아직 살아있습니다! 💪',
    source_url: 'https://twitter.com/cryptoking/status/B10',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/reentry_signal.png',
    media_type: 'image',
  },
];

// ============================================
// 시나리오 C: 1-3개월 전 (1D 차트 테스트) - 5개
// 일별로 분산, 가격: $59,000 ~ $75,000 (역사적 가격 반영)
// ============================================

const scenarioC: Signal[] = [
  {
    id: 'C1',
    influencer_id: '5',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 59000,
    signal_timestamp: getRelativeTimestamp(85 * 24),  // 85일 전
    original_text: '장기 매수 구간, 60K 지지 확인',
    full_text: '🐋 장기 매수 구간, 60K 지지 확인\n\n온체인 분석 결과, 59K~60K 구간이 강력한 축적 존으로 나타났습니다.\n\n장기 보유자들의 잔고가 지난 30일간 계속 증가 중이며, 거래소 보유량은 2019년 이후 최저치입니다.\n\n매크로 환경:\n- 미국 금리 인하 기대감 상승\n- 기관 투자자 유입 지속\n- 반감기 약 6개월 남음\n\n장기 투자자라면 이 구간에서 적립식 매수 추천드립니다.',
    source_url: 'https://twitter.com/whalealert/status/C1',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/onchain_accumulation.png',
    media_type: 'image',
  },
  {
    id: 'C2',
    influencer_id: '3',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 62000,
    signal_timestamp: getRelativeTimestamp(70 * 24),  // 70일 전
    original_text: 'ETF 유입 증가, 상승 예상',
    full_text: 'ETF 유입 증가, 상승 예상 📈\n\n블랙록 IBIT ETF가 어제 하루만 5억 달러 유입을 기록했습니다. 누적 유입량이 100억 달러를 돌파했어요.\n\n기관 자금이 본격적으로 들어오고 있습니다. 이건 2020년 MicroStrategy 매수 때와 비슷한 패턴이에요.\n\n62K에서 추가 매수했습니다. 목표가는 80K입니다.',
    source_url: 'https://twitter.com/traderjoe/status/C2',
    has_media: false,
  },
  {
    id: 'C3',
    influencer_id: '2',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 68000,
    signal_timestamp: getRelativeTimestamp(55 * 24),  // 55일 전
    original_text: '단기 조정 예상',
    full_text: '단기 조정 예상 ⚠️\n\n68K까지 빠르게 올랐네요. 단기간에 +15% 상승은 과열 신호입니다.\n\nRSI 80 돌파, 펀딩비 0.1%까지 치솟았습니다. 건강한 조정이 올 것 같아요.\n\n숏 진입했습니다. 65K~66K 부근까지 조정 예상합니다.\n\n레버리지 낮게 잡으세요!',
    source_url: 'https://twitter.com/bitcoinmax/status/C3',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/rsi_overbought.jpg',
    media_type: 'image',
  },
  {
    id: 'C4',
    influencer_id: '7',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 65000,
    signal_timestamp: getRelativeTimestamp(42 * 24),  // 42일 전
    original_text: '조정 완료, 재매수',
    full_text: '조정 완료, 재매수 ✅\n\n예상대로 65K까지 조정이 왔습니다. 여기서 다시 매수 들어갑니다.\n\n4시간봉 기준 더블바텀 패턴이 완성되었고, MACD 골든크로스 직전입니다.\n\n리스크 관리:\n- 진입가: $65,000\n- 손절가: $63,500\n- 목표가: $72,000 (1차), $80,000 (2차)\n\n손익비 3:1 이상입니다. 좋은 셋업이에요!',
    source_url: 'https://twitter.com/btcmaster/status/C4',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/double_bottom.png',
    media_type: 'image',
  },
  {
    id: 'C5',
    influencer_id: '1',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 75000,
    signal_timestamp: getRelativeTimestamp(30 * 24),  // 30일 전
    original_text: '역대 최고가 돌파 임박!',
    full_text: '🚀 역대 최고가 돌파 임박!\n\n75K 돌파했습니다! ATH(역대 최고가)인 69K를 뚫었어요!\n\n이제 가격 발견 구간입니다. 저항이 없는 영역이에요.\n\n제 개인적인 예측:\n- 단기: $80,000\n- 중기: $100,000\n- 장기: $150,000+\n\n비트코인 역사상 가장 큰 상승장이 될 수 있습니다. 홀딩만 하시면 됩니다! 💎🙌\n\n#Bitcoin #ATH #NewEra',
    source_url: 'https://twitter.com/cryptoking/status/C5',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/ath_breakout.jpg',
    media_type: 'image',
  },
];

// ============================================
// 시나리오 D: 클러스터링 테스트 (핵심!) - 7개
// 동일 타임스탬프에 여러 인플루언서 시그널
// ============================================

// 클러스터 1: 3명이 정확히 같은 시간에 시그널 (8시간 전)
const clusterTime1 = getRelativeTimestamp(8);

// 클러스터 2: 4명이 정확히 같은 시간에 시그널 (56시간 전 = 약 2.3일)
const clusterTime2 = getRelativeTimestamp(56);

const scenarioD: Signal[] = [
  // 클러스터 1: 3명 동시 (8시간 전)
  {
    id: 'D1',
    influencer_id: '1',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 97100,
    signal_timestamp: clusterTime1,
    original_text: '동시 롱 콜! - CryptoKing',
    full_text: '🚨 긴급! 동시 롱 콜!\n\n지금 당장 롱 진입하세요! 97.1K가 중요한 지지선입니다.\n\n대형 기관 매수 포착됐고, 온체인 데이터 전부 강세입니다. 이 기회를 놓치지 마세요!\n\n#Bitcoin #LongSignal #BuyNow',
    source_url: 'https://twitter.com/cryptoking/status/D1',
    has_media: false,
  },
  {
    id: 'D2',
    influencer_id: '3',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 97100,
    signal_timestamp: clusterTime1,  // 동일 시간!
    original_text: '동시 롱 콜! - TraderJoe',
    full_text: '롱 포지션 오픈 ✅\n\n97.1K에서 롱 진입합니다. 차트 분석 결과 상승 채널 하단에서 반등 중이에요.\n\n오늘 중으로 98K 테스트할 것 같습니다. 손절은 96.5K에 걸어두세요.\n\n첨부 차트 참고!',
    source_url: 'https://twitter.com/traderjoe/status/D2',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/ascending_channel.png',
    media_type: 'image',
  },
  {
    id: 'D3',
    influencer_id: '5',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',  // 반대 방향!
    entry_price: 97100,
    signal_timestamp: clusterTime1,  // 동일 시간!
    original_text: '나는 숏! - WhaleAlert',
    full_text: '⚠️ 경고: 나는 숏 진입합니다\n\n모두가 롱을 외칠 때가 가장 위험할 때입니다. 온체인 데이터를 보면 오히려 고래들이 거래소로 물량을 옮기고 있어요.\n\n지난 24시간:\n- 거래소 순유입: +1,800 BTC\n- 고래 잔고 감소: -2,100 BTC\n- SOPR: 1.05 (이익 실현 구간)\n\n단기 숏으로 대응합니다. 조심하세요!',
    source_url: 'https://twitter.com/whalealert/status/D3',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/whale_warning.png',
    media_type: 'image',
  },

  // 클러스터 2: 4명 동시 (56시간 전)
  {
    id: 'D4',
    influencer_id: '2',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 95800,
    signal_timestamp: clusterTime2,
    original_text: '숏 진입 - BitcoinMax',
    full_text: '숏 포지션 오픈 📉\n\n95.8K에서 숏 들어갑니다. 96K 저항이 강하네요. 이번 주 고점이 될 것 같습니다.\n\n목표가 94K, 손절 96.5K입니다.',
    source_url: 'https://twitter.com/bitcoinmax/status/D4',
    has_media: false,
  },
  {
    id: 'D5',
    influencer_id: '4',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 95800,
    signal_timestamp: clusterTime2,  // 동일 시간!
    original_text: '롱 진입 - MoonShot',
    full_text: '🚀 100K 가자!!!\n\n숏충이들 다 청산시키고 갈 겁니다! 95.8K에서 풀 레버리지 롱!\n\n오늘 안에 97K 간다! 누가 뭐래도 롱이다!!! 💪💪💪',
    source_url: 'https://twitter.com/moonshot/status/D5',
    has_media: false,
  },
  {
    id: 'D6',
    influencer_id: '6',
    coin_symbol: 'BTC',
    sentiment: 'LONG',
    entry_price: 95800,
    signal_timestamp: clusterTime2,  // 동일 시간!
    original_text: '롱 진입 - DeFiDegen',
    full_text: '롱으로 방향 잡습니다 📈\n\n95.8K 지지 확인 후 롱 진입이요. DeFi TVL도 증가 추세고, 스테이블코인 발행량도 늘고 있어요.\n\n거시적으로 유동성이 시장에 들어오는 중입니다. 비트코인 상승은 시간 문제예요.',
    source_url: 'https://twitter.com/defidegen/status/D6',
    has_media: true,
    media_url: 'https://pbs.twimg.com/media/defi_tvl_chart.jpg',
    media_type: 'image',
  },
  {
    id: 'D7',
    influencer_id: '8',
    coin_symbol: 'BTC',
    sentiment: 'SHORT',
    entry_price: 95800,
    signal_timestamp: clusterTime2,  // 동일 시간!
    original_text: '숏 진입 - CryptoNewbie',
    full_text: '저도 숏 들어가봅니다... 🙈\n\n비트맥스 형님이 숏이라고 하셔서 따라갑니다 ㅎㅎ\n\n맞으면 좋겠다... 제발... 🙏',
    source_url: 'https://twitter.com/cryptonewbie/status/D7',
    has_media: false,
  },
];

// ============================================
// 모든 시나리오 통합 및 내보내기
// ============================================

// 개별 시나리오 내보내기 (테스트용)
export const scenarios = {
  hourly: scenarioA,      // 1H 차트 테스트용
  fourHour: scenarioB,    // 4H 차트 테스트용
  daily: scenarioC,       // 1D 차트 테스트용
  clustered: scenarioD,   // 클러스터링 테스트용
};

// 전체 시그널 (최신순 정렬)
export const signals: Signal[] = [
  ...scenarioA,
  ...scenarioB,
  ...scenarioC,
  ...scenarioD,
].sort((a, b) => b.signal_timestamp - a.signal_timestamp);

// 인플루언서 정보 조인
export const signalsWithInfluencer: Signal[] = signals.map((signal) => ({
  ...signal,
  influencer: influencers.find((i) => i.id === signal.influencer_id),
}));

// ============================================
// 동적 가격 할당 함수
// 캔들 데이터를 기반으로 시그널의 entry_price를 실제 가격으로 설정
// ============================================

/**
 * 시그널의 entry_price를 실제 캔들 데이터 기반으로 설정
 * @param candleData - Binance에서 가져온 캔들 데이터
 * @param timeframe - 현재 타임프레임
 * @returns entry_price가 실제 가격으로 설정된 시그널 배열
 */
export function getSignalsWithRealPrices(
  candleData: CandleData[],
  timeframe: TimeframeType
): Signal[] {
  // 캔들 데이터가 없으면 원본 시그널 반환
  if (!candleData || candleData.length === 0) {
    return signalsWithInfluencer;
  }

  // O(1) 조회를 위한 캔들 Map
  const candleMap = new Map(candleData.map((c) => [c.time, c]));

  return signalsWithInfluencer.map((signal) => {
    // 시그널 타임스탬프를 해당 타임프레임의 캔들 시작 시간으로 정렬
    const alignedTime = getCandleStartTime(signal.signal_timestamp, timeframe);
    const candle = candleMap.get(alignedTime);

    if (candle) {
      // 캔들이 있으면 close 가격 사용 (실제 크롤링 시점의 가격과 유사)
      return {
        ...signal,
        entry_price: candle.close,
      };
    }

    // 캔들이 없으면 가장 가까운 캔들 찾기
    const candleTimes = Array.from(candleMap.keys()).sort((a, b) => a - b);

    // 캔들 시간 배열이 비어있으면 원본 entry_price 사용
    if (candleTimes.length === 0) {
      return signal;
    }

    const closestTime = candleTimes.reduce((prev, curr) =>
      Math.abs(curr - alignedTime) < Math.abs(prev - alignedTime) ? curr : prev
    );
    const closestCandle = candleMap.get(closestTime);

    return {
      ...signal,
      entry_price: closestCandle?.close ?? signal.entry_price,
    };
  });
}
