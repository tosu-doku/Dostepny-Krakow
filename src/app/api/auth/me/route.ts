import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getUserById, verifySessionToken } from '@/services/auth';

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get(AUTH_COOKIE_NAME)?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const decoded = verifySessionToken(token);
    if (!decoded) {
      return NextResponse.json({ user: null });
    }

    const user = await getUserById(decoded.id);
    if (!user || user.is_banned) {
      // Clear cookie if user not found or banned
      const res = NextResponse.json({ user: null });
      res.cookies.set(AUTH_COOKIE_NAME, '', { path: '/', maxAge: 0 });
      return res;
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ user: null, error: error.message }, { status: 500 });
  }
}
