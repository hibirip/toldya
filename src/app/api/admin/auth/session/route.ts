import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const session = await verifySession(token);

    return NextResponse.json({
      authenticated: session.valid,
      email: session.email,
    });
  } catch (error) {
    console.error('[Session API] Error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
