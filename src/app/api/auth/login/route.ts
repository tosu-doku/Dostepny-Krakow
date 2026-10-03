import { NextRequest, NextResponse } from 'next/server';
import { loginUser, createSessionToken, AUTH_COOKIE_NAME } from '@/services/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user = await loginUser({
      email: body.email,
      password: body.password,
    });

    const token = createSessionToken({
      id: user.id,
      nickname: user.nickname,
      email: user.email,
    });

    const res = NextResponse.json({ user, token }, { status: 200 });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Błąd logowania.' },
      { status: 401 }
    );
  }
}
