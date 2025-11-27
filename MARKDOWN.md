# Project: Crypto Signal Overlay (가제: 박제소)
# Version: 1.0 (MVP)

## 1. 프로젝트 개요
비트코인 차트 위에 유명 인플루언서들의 과거 발언(Long/Short)을 시각적 마커로 오버레이 하여, 그들의 예측 적중률을 직관적으로 검증하는 "신뢰도 검증 플랫폼"이다.

## 2. 핵심 기술 스택 (Tech Stack)
이 프로젝트는 1인 개발 및 빠른 유지보수를 위해 다음 스택을 **강제**한다.

* **Framework:** Next.js 14+ (App Router 방식)
    * *이유:* SEO 최적화 및 백엔드 API 통합 용이성.
* **Language:** TypeScript
    * *이유:* 데이터 타입 오류 방지 (금융 데이터 정합성 중요).
* **Styling:** Tailwind CSS
    * *Design System:* 다크 모드 기본 (`bg-zinc-950`), 포인트 컬러 Amber (`text-amber-500`), 미니멀리즘.
* **Charting:** TradingView Lightweight Charts
    * *필수:* `SeriesMarker` 기능을 사용하여 인플루언서 프사를 차트 위에 렌더링.
* **Database & Auth:** Supabase
    * *이유:* 실시간 데이터(Realtime) 처리 및 백엔드 구축 시간 단축.
* **Data Fetching:** React Query (TanStack Query) 또는 SWR
    * *이유:* 차트 데이터 캐싱 및 실시간 업데이트 관리.

## 3. 메인 페이지 UI/UX 구조 (Layout)
화면은 불필요한 스크롤을 최소화하고, 차트 몰입도를 높이는 **Dashboard 형태**로 구성한다.

### A. Header (높이 60px 고정)
* **Left:** 로고 (심플한 텍스트 or 아이콘).
* **Center:** 주요 지표 티커 (현재 BTC 가격, 24시간 변동률 - 흐르는 텍스트).
* **Right:**
    * 필터 버튼 (All / Long Only / Short Only).
    * 로그인/설정 아이콘.

### B. Main Visual: The Chart (화면의 60~70% 차지)
* **라이브러리:** TradingView Lightweight Charts.
* **기능:**
    * 캔들스틱 차트 (기본 BTC/USDT).
    * **Custom Markers:**
        * 특정 시간/가격에 인플루언서의 아바타(원형 이미지) 표시.
        * 마커 호버(Hover) 시: 툴팁으로 요약 내용 ("Elon: 65k 간다") 표시.
        * 마커 클릭(Click) 시: 하단 피드 리스트의 해당 항목으로 스크롤 이동 및 하이라이트.
* **시각적 디테일:** 배경은 완전 검정(`Not white`), 그리드는 흐릿하게, 캔들은 선명하게.

### C. Bottom Section: Signal Feed (화면의 30~40%)
* 차트 하단에 위치 (모바일에서는 차트 아래로 스크롤).
* **구성:** 타임라인 리스트 형태.
* **항목 디자인:**
    * 좌측: 인플루언서 프로필 사진 + 신뢰도 뱃지 (색상으로 구분).
    * 중앙: 코멘트 내용 (AI 요약본) + 원본 링크 아이콘.
    * 우측: 당시 가격 vs 현재 가격 수익률 표기 (예: `+15.4%` 초록색 / `-5.2%` 빨간색).

## 4. 데이터 구조 (Schema Draft for Supabase)
AI가 코드를 짤 때 참고할 DB 구조.

* **Table: `influencers`**
    * `id`, `name`, `handle` (twitter ID), `avatar_url`, `trust_score` (적중률 점수).
* **Table: `signals`**
    * `id`, `influencer_id`, `coin_symbol` (BTC), `sentiment` (LONG/SHORT), `entry_price`, `signal_time`, `original_text`, `source_url`.

## 5. 단계별 개발 로드맵 (Roadmap)

### Phase 1: 껍데기 만들기 (현재 단계)
* Next.js 세팅 및 다크 모드 테마 적용.
* TradingView 차트를 컴포넌트화하여 화면에 띄우기.
* 하드코딩된(Mock) 데이터로 차트 위에 마커 찍어보기 (가장 중요).

### Phase 2: 데이터 연동
* Supabase 연결.
* Mock 데이터를 DB에 넣고 불러와서 차트에 뿌리기.

### Phase 3: 자동화 & 고도화 (추후 업그레이드 고려)
* **수집 자동화:** Apify → Next.js API Route → OpenAI(분석) → Supabase 파이프라인 구축.
* **채점 시스템:** 매일 자정, 과거 시그널의 승패를 판별하여 `trust_score` 업데이트 기능 추가.
* **SNS 기능:** 사용자 로그인 후 댓글 달기 및 "성지순례" 기능 추가.

## 6. 개발 시 주의사항 (AI 지침)
1.  **Client Component 분리:** 차트 라이브러리는 `window` 객체를 쓰므로 반드시 `"use client"` 지시어를 사용한 별도 컴포넌트로 만들 것.
2.  **반응형 대응:** 모바일에서는 차트 높이를 줄이고 피드 가독성을 높일 것. (Touch interaction 고려).
3.  **에러 처리:** 데이터가 로딩되지 않아도 차트 뼈대(Skeleton)는 먼저 보여줄 것.