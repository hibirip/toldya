import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchHistoricalBTCPrice } from '@/lib/binance';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  console.log('========================================');
  console.log('[MIGRATE] Starting price migration...');
  console.log('========================================');

  const supabase = getSupabaseClient();

  // 모든 시그널 가져오기
  const { data: signals, error: fetchError } = await supabase
    .from('signals')
    .select('id, signal_timestamp, entry_price');

  if (fetchError) {
    console.error('[MIGRATE] Error fetching signals:', fetchError);
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
  }

  if (!signals || signals.length === 0) {
    return NextResponse.json({ success: true, message: 'No signals to migrate', updated: 0 });
  }

  console.log(`[MIGRATE] Found ${signals.length} signals to update`);

  let updated = 0;
  let failed = 0;

  for (const signal of signals) {
    console.log(`[MIGRATE] Processing signal ${signal.id}, timestamp: ${signal.signal_timestamp}`);

    // 과거 BTC 가격 조회
    const historicalPrice = await fetchHistoricalBTCPrice(signal.signal_timestamp);

    if (!historicalPrice) {
      console.log(`[MIGRATE] Failed to get price for signal ${signal.id}`);
      failed++;
      continue;
    }

    console.log(`[MIGRATE] Signal ${signal.id}: ${signal.entry_price} -> ${historicalPrice}`);

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('signals')
      .update({ entry_price: historicalPrice })
      .eq('id', signal.id);

    if (updateError) {
      console.error(`[MIGRATE] Update error for signal ${signal.id}:`, updateError);
      failed++;
    } else {
      updated++;
    }

    // Rate limiting (바이낸스 API 제한 방지)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('========================================');
  console.log(`[MIGRATE] Migration complete!`);
  console.log(`[MIGRATE] Updated: ${updated}, Failed: ${failed}`);
  console.log('========================================');

  return NextResponse.json({
    success: true,
    total: signals.length,
    updated,
    failed,
  });
}
