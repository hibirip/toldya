import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { verifySession } from '@/lib/adminAuth';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VERIFY_PROMPT = `You are verifying a previously classified Bitcoin sentiment signal.

Original classification:
- Sentiment: {sentiment}
- Summary: {summary}

Original tweet text:
"{original_text}"

Your task:
1. Analyze the tweet carefully
2. Determine if the original classification is CORRECT or INCORRECT
3. If incorrect, provide the correct sentiment

Consider:
- Sarcasm and irony (criticizing Bitcoin critics = BULLISH)
- Context and tone
- Whether this is actually about Bitcoin/BTC

Output JSON only:
{
  "verification": "CORRECT" | "INCORRECT",
  "correct_sentiment": "LONG" | "SHORT" | "NEUTRAL",
  "confidence": 0-100,
  "reason": "한글로 검증 이유 설명 (20자 이내)"
}`;

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { signalId } = await request.json();

    if (!signalId) {
      return NextResponse.json({ error: 'Signal ID is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // 시그널 조회
    const { data: signal, error: fetchError } = await supabase
      .from('signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (fetchError || !signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    // Claude로 검증
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const prompt = VERIFY_PROMPT
      .replace('{sentiment}', signal.sentiment)
      .replace('{summary}', signal.summary || '')
      .replace('{original_text}', signal.original_text);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Invalid Claude response' }, { status: 500 });
    }

    // JSON 파싱
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 });
    }

    const verification = JSON.parse(jsonMatch[0]);

    // 검증 결과가 INCORRECT이고 sentiment가 다르면 업데이트 옵션 제공
    return NextResponse.json({
      signal: {
        id: signal.id,
        original_sentiment: signal.sentiment,
        original_text: signal.original_text,
        summary: signal.summary,
      },
      verification,
    });
  } catch (error) {
    console.error('[Verify API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// 검증 후 sentiment 업데이트
export async function PUT(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await verifySession(token);
  if (!session.valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { signalId, newSentiment, newSummary } = await request.json();

    if (!signalId || !newSentiment) {
      return NextResponse.json({ error: 'Signal ID and new sentiment required' }, { status: 400 });
    }

    // NEUTRAL은 삭제 처리
    if (newSentiment === 'NEUTRAL') {
      const supabase = getSupabase();
      await supabase.from('signals').delete().eq('id', signalId);
      return NextResponse.json({ success: true, action: 'deleted', reason: 'NEUTRAL signals are removed' });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('signals')
      .update({
        sentiment: newSentiment,
        ...(newSummary && { summary: newSummary }),
      })
      .eq('id', signalId);

    if (error) {
      console.error('[Verify API] Update error:', error);
      return NextResponse.json({ error: 'Failed to update signal' }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'updated' });
  } catch (error) {
    console.error('[Verify API] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
