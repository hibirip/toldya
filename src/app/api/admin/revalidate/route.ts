import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Claude 시스템 프롬프트 (강화된 버전)
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

interface ClaudeAnalysis {
  sentiment: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  summary: string;
}

interface Signal {
  id: string;
  sentiment: 'LONG' | 'SHORT';
  original_text: string;
  summary: string;
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

export async function GET() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          REVALIDATE API STARTED                            ║');
  console.log('║          Time:', new Date().toISOString(), '              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = {
    total: 0,
    deleted: 0,
    updated: 0,
    unchanged: 0,
    errors: [] as string[],
    details: [] as { id: string; original_text: string; old_sentiment: string; new_sentiment: string; action: string }[],
  };

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. 최근 시그널 50개 조회
    console.log('[Step 1] Fetching recent 50 signals...');
    const { data: signals, error: fetchError } = await supabase
      .from('signals')
      .select('id, sentiment, original_text, summary')
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error('[Step 1] Error fetching signals:', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
    }

    if (!signals || signals.length === 0) {
      console.log('[Step 1] No signals found');
      return NextResponse.json({ success: true, message: 'No signals to revalidate' });
    }

    results.total = signals.length;
    console.log(`[Step 1] Found ${signals.length} signals to revalidate`);

    // 2. 각 시그널 재분석
    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i] as Signal;
      console.log('----------------------------------------');
      console.log(`[Processing] Signal ${i + 1}/${signals.length}`);
      console.log(`[Processing] ID: ${signal.id}`);
      console.log(`[Processing] Current sentiment: ${signal.sentiment}`);
      console.log(`[Processing] Text: ${signal.original_text.slice(0, 100)}...`);

      try {
        // Claude 재분석
        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 256,
          system: CLAUDE_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: signal.original_text }],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          console.log('[Processing] ERROR: Claude response is not text');
          results.errors.push(`Signal ${signal.id}: Response not text`);
          continue;
        }

        const jsonStr = extractJSON(content.text);
        let analysis: ClaudeAnalysis;
        try {
          analysis = JSON.parse(jsonStr);
        } catch (parseError) {
          console.log('[Processing] JSON parse error:', parseError);
          results.errors.push(`Signal ${signal.id}: JSON parse error`);
          continue;
        }

        console.log(`[Processing] New analysis: ${analysis.sentiment} (confidence: ${analysis.confidence})`);
        console.log(`[Processing] New summary: ${analysis.summary}`);

        // 3. 결과에 따라 처리
        if (analysis.sentiment === 'NEUTRAL') {
          // NEUTRAL이면 삭제
          console.log(`[Processing] ❌ DELETING - sentiment is NEUTRAL`);
          const { error: deleteError } = await supabase
            .from('signals')
            .delete()
            .eq('id', signal.id);

          if (deleteError) {
            console.error('[Processing] Delete error:', deleteError);
            results.errors.push(`Signal ${signal.id}: Delete failed`);
          } else {
            results.deleted++;
            results.details.push({
              id: signal.id,
              original_text: signal.original_text.slice(0, 50) + '...',
              old_sentiment: signal.sentiment,
              new_sentiment: 'NEUTRAL',
              action: 'DELETED',
            });
          }
        } else if (analysis.sentiment !== signal.sentiment) {
          // sentiment가 변경되면 업데이트
          console.log(`[Processing] 🔄 UPDATING - sentiment changed: ${signal.sentiment} → ${analysis.sentiment}`);
          const { error: updateError } = await supabase
            .from('signals')
            .update({
              sentiment: analysis.sentiment,
              summary: analysis.summary,
            })
            .eq('id', signal.id);

          if (updateError) {
            console.error('[Processing] Update error:', updateError);
            results.errors.push(`Signal ${signal.id}: Update failed`);
          } else {
            results.updated++;
            results.details.push({
              id: signal.id,
              original_text: signal.original_text.slice(0, 50) + '...',
              old_sentiment: signal.sentiment,
              new_sentiment: analysis.sentiment,
              action: 'UPDATED',
            });
          }
        } else {
          // 동일하면 유지
          console.log(`[Processing] ✅ UNCHANGED - sentiment is same`);
          results.unchanged++;
        }

        // Rate limiting - 0.5초 대기
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`[Processing] Error for signal ${signal.id}:`, error);
        results.errors.push(`Signal ${signal.id}: ${String(error)}`);
      }
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    REVALIDATE SUMMARY                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Total: ${results.total}`);
    console.log(`║  Deleted (NEUTRAL): ${results.deleted}`);
    console.log(`║  Updated (changed): ${results.updated}`);
    console.log(`║  Unchanged: ${results.unchanged}`);
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
